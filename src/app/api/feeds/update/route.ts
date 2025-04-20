import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { executeQuery } from "@/lib/db";
import { comprehensiveFeedProcessor } from "@/lib/feed-processor";

export async function POST(request: NextRequest) {
  try {
    // Validate admin session
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

    // Only admins can trigger updates
    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Permission denied" },
        { status: 403 },
      );
    }

    // Find feeds that need updating (not updated in the last hour)
    const outdatedFeeds = await executeQuery({
      query: `
        SELECT FeedID, FeedURL, Title
        FROM Feeds
        WHERE LastFetchedAt IS NULL
        OR LastFetchedAt < DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ORDER BY LastFetchedAt ASC
        LIMIT 10
      `,
    });

    if (!Array.isArray(outdatedFeeds) || outdatedFeeds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No feeds need updating at this time",
      });
    }

    // Update each feed
    const results = [];
    for (const feed of outdatedFeeds) {
      try {
        console.log(`Updating feed: ${feed.Title} (${feed.FeedURL})`);
        const result = await comprehensiveFeedProcessor(feed.FeedURL);
        results.push({
          feedId: feed.FeedID,
          title: feed.Title,
          success: result.success,
          message: result.message,
        });
      } catch (feedError) {
        console.error(`Error updating feed ${feed.FeedID}:`, feedError);
        results.push({
          feedId: feed.FeedID,
          title: feed.Title,
          success: false,
          message:
            feedError instanceof Error ? feedError.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} feeds`,
      results,
    });
  } catch (error) {
    console.error("Feed update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
