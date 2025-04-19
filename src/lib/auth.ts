import crypto from "crypto";
import pool, { executeQuery } from "./db";

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
  // Sanitize and normalize inputs
  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  // Validate presence
  if (!trimmedName || !normalizedEmail || !password) {
    return { success: false, error: "Missing required registration fields" };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, error: "Invalid email format" };
  }

  // Start a transaction on a dedicated connection
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check if user already exists
    const [existingRows]: any[] = await conn.query(
      "SELECT Email FROM Users WHERE Email = ?",
      [normalizedEmail]
    );
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      await conn.rollback();
      return { success: false, error: "Email already in use" };
    }

    // Hash password
    const { hash, salt } = hashPassword(password);
    const passwordHash = `${hash}:${salt}`;

    // Insert the new user
    const insertRes: any = await conn.query(
      "INSERT INTO Users (Name, Email, PasswordHash, Role) VALUES (?, ?, ?, 'user')",
      [trimmedName, normalizedEmail, passwordHash]
    );
    const userId = insertRes.insertId;

    // Commit the transaction
    await conn.commit();

    // Confirm insertion
    const [userRow]: any[] = await conn.query(
      "SELECT UserID AS id, Name AS name, Email AS email, Role AS role FROM Users WHERE UserID = ?",
      [userId]
    );
    // Ensure User_Role is populated
    await conn.query(
      "INSERT IGNORE INTO User_Role (UserID, Role) VALUES (?, ?)",
      [userRow.id, userRow.role]
    );
    return { success: true, user: userRow };
  } catch (err: any) {
    console.error("Registration transaction error:", err);
    try { await conn.rollback(); } catch {}
    if (err.code === "ER_DUP_ENTRY") {
      return { success: false, error: "Email already in use" };
    }
    // Rethrow unknown errors
    throw err;
  } finally {
    conn.release();
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
