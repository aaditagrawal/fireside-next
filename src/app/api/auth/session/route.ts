import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    // Get token directly from cookie in the request
    const sessionToken = request.cookies.get("session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ user: null });
    }

    // Validate token and get user
    const user = await validateSession(sessionToken);

    if (user) {
      return NextResponse.json({ user });
    } else {
      return NextResponse.json({ user: null });
    }
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      { error: "Failed to check session", user: null },
      { status: 500 },
    );
  }
}
