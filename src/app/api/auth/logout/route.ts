import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    // Get the current session token
    const sessionToken = request.cookies.get("session-token")?.value;

    if (sessionToken) {
      // Delete the session from database
      await deleteSession(sessionToken);
    }

    // Create response
    const response = NextResponse.json({ success: true });

    // Delete the cookie in the response
    response.cookies.delete("session-token");

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to logout" },
      { status: 500 },
    );
  }
}
