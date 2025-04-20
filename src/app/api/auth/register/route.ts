import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { executeQuery } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Server-side validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Register the user
    const result = await registerUser({ name, email, password });

    if (result.success && result.user) {
      // Verify the user was persisted
      const verifyRes: any[] = await executeQuery({
        query: "SELECT COUNT(*) AS count FROM Users WHERE UserID = ?",
        values: [result.user.id],
      });
      if (!Array.isArray(verifyRes) || verifyRes[0].count === 0) {
        console.error(`Signup succeeded but no Users row for ID ${result.user.id}`);
        return NextResponse.json(
          { success: false, error: "Registration failed: no DB entry" },
          { status: 500 }
        );
      }

      // Create a new session
      const sessionToken = await createSession(result.user.id);

      // Create a response object
      const response = NextResponse.json({
        success: true,
        user: result.user,
      });

      // Set the cookie in the response
      response.cookies.set("session-token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week in seconds
        path: "/",
      });

      return response;
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }
  } catch (error: unknown) {
    console.error("Registration route error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred during registration" },
      { status: 500 },
    );
  }
}
