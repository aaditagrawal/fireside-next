import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { getUserSubscriptions } from "@/lib/rss-parser";

export async function GET(request: NextRequest) {
  try {
    // Get the current session token
    const sessionToken = request.cookies.get("session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    // Validate the session and get the user
    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 },
      );
    }

    // Get user's subscriptions
    const result = await getUserSubscriptions(user.id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        subscriptions: result.subscriptions,
      });
    }
    console.error("Failed to fetch subscriptions:", result.error);
    // Return status 200 even on failure to let client handle error
    return NextResponse.json({ success: false, error: result.error });
  } catch (error: unknown) {
    console.error("Fetch subscriptions error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching subscriptions",
      },
      { status: 500 },
    );
  }
}
