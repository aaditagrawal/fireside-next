import crypto from "crypto";
import { executeQuery } from "./db";

interface RegisterParams {
  name: string;
  email: string;
  password: string;
}

interface LoginParams {
  email: string;
  password: string;
}

// Hash password with SHA-256 and random salt (in real applications, use bcrypt or Argon2)
function hashPassword(
  password: string,
  salt?: string,
): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .createHash("sha256")
    .update(password + generatedSalt)
    .digest("hex");

  return { hash, salt: generatedSalt };
}

// Register a new user
export async function registerUser({ name, email, password }: RegisterParams) {
  try {
    // Check if user already exists
    const existingUser = await executeQuery({
      query: "SELECT Email FROM Users WHERE Email = ?",
      values: [email],
    });

    if (Array.isArray(existingUser) && existingUser.length > 0) {
      return { success: false, error: "Email already in use" };
    }

    // Hash the password with a salt
    const { hash, salt } = hashPassword(password);
    const passwordHash = `${hash}:${salt}`; // Store hash and salt together

    // Insert new user
    const result = await executeQuery({
      query:
        "INSERT INTO Users (Name, Email, PasswordHash, Role) VALUES (?, ?, ?, 'user')",
      values: [name, email, passwordHash],
    });

    if (!result || !("insertId" in result)) {
      return { success: false, error: "Failed to create user" };
    }

    // Return success with user info (excluding password)
    return {
      success: true,
      user: {
        id: result.insertId,
        name,
        email,
        role: "user",
      },
    };
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Registration failed",
    };
  }
}

// Login a user
export async function loginUser({ email, password }: LoginParams) {
  try {
    // Find user by email
    const users = await executeQuery({
      query:
        "SELECT UserID, Name, Email, PasswordHash, Role FROM Users WHERE Email = ?",
      values: [email],
    });

    // Check if user exists
    if (!Array.isArray(users) || users.length === 0) {
      return { success: false, error: "Invalid email or password" };
    }

    const user = users[0];

    // Get stored hash and salt
    const [storedHash, salt] = user.PasswordHash.split(":");

    // Calculate hash of provided password with the stored salt
    const { hash: calculatedHash } = hashPassword(password, salt);

    // Check if passwords match
    if (calculatedHash !== storedHash) {
      return { success: false, error: "Invalid email or password" };
    }

    // Update last login time
    await executeQuery({
      query: "UPDATE Users SET LastLogin = NOW() WHERE UserID = ?",
      values: [user.UserID],
    });

    // Return success with user info
    return {
      success: true,
      user: {
        id: user.UserID,
        name: user.Name,
        email: user.Email,
        role: user.Role,
      },
    };
  } catch (error: unknown) {
    console.error("Login error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Login failed",
    };
  }
}
