import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { executeQuery } from "@/lib/db";

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

    // Get feed ID from query string
    const feedId = request.nextUrl.searchParams.get("feedId");
    if (!feedId || isNaN(parseInt(feedId, 10))) {
      return NextResponse.json(
        { success: false, error: "Invalid feed ID" },
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
      values: [user.id, parseInt(feedId, 10)],
    });

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return NextResponse.json(
        { success: false, error: "You are not subscribed to this feed" },
        { status: 403 },
      );
    }

    // Get feed details
    const feeds = await executeQuery({
      query: `
        SELECT
          f.FeedID,
          f.Title,
          f.Description,
          f.FeedURL,
          f.LastFetchedAt
        FROM Feeds f
        WHERE f.FeedID = ?
      `,
      values: [parseInt(feedId, 10)],
    });

    if (!Array.isArray(feeds) || feeds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Feed not found" },
        { status: 404 },
      );
    }

    // Format the feed data
    const feed = {
      FeedID: feeds[0].FeedID,
      Title: feeds[0].Title || "Untitled Feed",
      Description: feeds[0].Description || "",
      FeedURL: feeds[0].FeedURL,
      LastFetchedAt: feeds[0].LastFetchedAt
        ? new Date(feeds[0].LastFetchedAt).toISOString()
        : null,
    };

    return NextResponse.json({
      success: true,
      feed,
    });
  } catch (error: unknown) {
    console.error("Fetch feed details error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching feed details",
      },
      { status: 500 },
    );
  }
}
