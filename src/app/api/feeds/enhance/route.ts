import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import {
  comprehensiveFeedProcessor,
  refreshAllFeeds,
} from "@/lib/feed-processor";

export async function POST(request: NextRequest) {
  try {
    // Validate session
    const sessionToken = request.cookies.get("session-token")?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const user = await validateSession(sessionToken);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 },
      );
    }

    // Check if user has admin role (can be adjusted based on your permissions model)
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Permission denied. Admin access required." },
        { status: 403 },
      );
    }

    // Get action from request body
    const body = await request.json();
    const { action, feedUrl } = body;

    if (action === "enhanceFeed" && feedUrl) {
      // Process a single feed
      const result = await comprehensiveFeedProcessor(feedUrl);
      return NextResponse.json(result);
    } else if (action === "refreshAll") {
      // Refresh all feeds
      const result = await refreshAllFeeds();
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Use 'enhanceFeed' or 'refreshAll'.",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Feed enhancement error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
