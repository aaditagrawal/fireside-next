import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { executeQuery } from "@/lib/db";
import { fetchFeed, processFeed } from "@/lib/rss-parser";

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

    // Check if the user is subscribed to this feed
    const subscriptions = await executeQuery({
      query: `
        SELECT s.SubscriptionID
        FROM Subscriptions s
        WHERE s.UserID = ? AND s.FeedID = ?
      `,
      values: [user.id, feedId],
    });

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return NextResponse.json(
        { success: false, error: "You are not subscribed to this feed" },
        { status: 403 },
      );
    }

    // Get the feed URL
    const feeds = await executeQuery({
      query: "SELECT FeedURL FROM Feeds WHERE FeedID = ?",
      values: [feedId],
    });

    if (!Array.isArray(feeds) || feeds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Feed not found" },
        { status: 404 },
      );
    }

    const feedUrl = feeds[0].FeedURL;

    // Process the feed to update it
    const result = await processFeed(feedUrl);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 },
      );
    }
  } catch (error: unknown) {
    console.error("Refresh feed error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to refresh feed",
      },
      { status: 500 },
    );
  }
}
