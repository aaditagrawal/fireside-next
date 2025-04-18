import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { executeQuery } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Get session token
    const sessionToken = request.cookies.get("session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    // Validate session
    const user = await validateSession(sessionToken);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 },
      );
    }

    // Get feed ID from request body
    const body = await request.json();
    const { feedId } = body;

    if (!feedId) {
      return NextResponse.json(
        { success: false, error: "Feed ID is required" },
        { status: 400 },
      );
    }

    // Delete subscription
    await executeQuery({
      query: "DELETE FROM Subscriptions WHERE UserID = ? AND FeedID = ?",
      values: [user.id, feedId],
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to unsubscribe from feed",
      },
      { status: 500 },
    );
  }
}
