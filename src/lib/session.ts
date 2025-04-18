import { cookies } from "next/headers";
import { executeQuery } from "./db";
import crypto from "crypto";

interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

// Generate a secure session token
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Store session in database
export async function createSession(userId: number): Promise<string> {
  try {
    // Generate a unique token
    const token = generateSessionToken();

    // Set expiry (e.g., 7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store session in database
    await executeQuery({
      query: `
        INSERT INTO UserSessions (UserID, SessionToken, ExpiresAt)
        VALUES (?, ?, ?)
      `,
      values: [userId, token, expiresAt],
    });

    return token;
  } catch (error) {
    console.error("Error creating session:", error);
    throw new Error("Failed to create session");
  }
}

// Validate a session token and retrieve user
export async function validateSession(
  token: string,
): Promise<SessionUser | null> {
  try {
    if (!token) return null;

    // Find session and join with user
    const sessions = await executeQuery({
      query: `
        SELECT
          u.UserID as id, u.Name as name, u.Email as email, u.Role as role,
          s.ExpiresAt as expiresAt
        FROM UserSessions s
        JOIN Users u ON s.UserID = u.UserID
        WHERE s.SessionToken = ? AND s.ExpiresAt > NOW()
      `,
      values: [token],
    });

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return null;
    }

    // Return user data
    return sessions[0] as SessionUser;
  } catch (error) {
    console.error("Session validation error:", error);
    return null;
  }
}

// Remove session (logout)
export async function deleteSession(token: string): Promise<boolean> {
  try {
    await executeQuery({
      query: "DELETE FROM UserSessions WHERE SessionToken = ?",
      values: [token],
    });
    return true;
  } catch (error) {
    console.error("Error deleting session:", error);
    return false;
  }
}

// Function to set session cookie
export function setSessionCookie(token: string): void {
  // Use synchronous version for the API routes
  cookies().set("session-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week in seconds
    path: "/",
  });
}

// Function to delete session cookie
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session-token");
}

// Get current session token from cookies
export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("session-token")?.value;
}
