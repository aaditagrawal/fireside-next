import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { fetchFeed } from "@/lib/rss-parser";

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

    // Get feed URL from request body
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Feed URL is required" },
        { status: 400 },
      );
    }

    // Try to fetch and parse the feed
    const feed = await fetchFeed(url);

    if (!feed) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch or parse feed" },
        { status: 400 },
      );
    }

    // Return the parsed feed for debugging
    return NextResponse.json({
      success: true,
      feed: {
        title: feed.title,
        description: feed.description,
        link: feed.link,
        feedUrl: feed.feedUrl,
        itemCount: feed.items?.length || 0,
        sample: feed.items?.slice(0, 2), // Just return a couple items to keep response size reasonable
      },
    });
  } catch (error: unknown) {
    console.error("Debug feed error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to debug feed",
      },
      { status: 500 },
    );
  }
}
