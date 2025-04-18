import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Server-side validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Login the user
    const result = await loginUser({ email, password });

    if (result.success && result.user) {
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
        { status: 401 },
      );
    }
  } catch (error: unknown) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred during login" },
      { status: 500 },
    );
  }
}
