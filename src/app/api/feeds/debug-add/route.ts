import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { executeQuery } from "@/lib/db";
import { fetchFeed } from "@/lib/rss-parser";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session-token")?.value;
    const user = token ? await validateSession(token) : null;
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const { url } = await request.json();
    if (!url) {
      return NextResponse.json(
        { success: false, error: "Missing feed URL" },
        { status: 400 },
      );
    }

    // Step 1: Fetch and parse the feed
    console.log(`Fetching feed from: ${url}`);
    const feed = await fetchFeed(url);

    if (!feed) {
      return NextResponse.json({
        success: false,
        error: "Failed to fetch or parse feed",
        stage: "fetchFeed",
      });
    }

    // Step 2: Check if feed exists
    console.log(`Checking if feed exists: ${url}`);
    const existingFeeds = await executeQuery({
      query: "SELECT FeedID, Title FROM Feeds WHERE FeedURL = ?",
      values: [url],
    });

    // Step 3: Process publisher
    let publisherId = null;
    if (feed.publisher?.name) {
      console.log(`Processing publisher: ${feed.publisher.name}`);
      try {
        const publisherResult = await executeQuery({
          query: "SELECT PublisherID FROM Publishers WHERE Name = ?",
          values: [feed.publisher.name],
        });

        if (Array.isArray(publisherResult) && publisherResult.length > 0) {
          publisherId = publisherResult[0].PublisherID;
        } else {
          // Fix: Make sure we're only passing the intended values
          const publisherUrl =
            typeof feed.publisher.url === "string"
              ? feed.publisher.url
              : typeof feed.link === "string"
                ? feed.link
                : "";

          console.log(
            `Inserting publisher: Name=${feed.publisher.name}, Website=${publisherUrl}`,
          );

          const newPublisher = await executeQuery({
            query: "INSERT INTO Publishers (Name, Website) VALUES (?, ?)",
            values: [feed.publisher.name, publisherUrl],
          });

          if (
            newPublisher &&
            typeof newPublisher === "object" &&
            "insertId" in newPublisher
          ) {
            publisherId = newPublisher.insertId;
          }
        }
      } catch (publisherError) {
        return NextResponse.json({
          success: false,
          error: `Publisher error: ${publisherError instanceof Error ? publisherError.message : "Unknown error"}`,
          stage: "publisherProcessing",
          details: publisherError,
        });
      }
    }

    // Return success information
    const existing =
      Array.isArray(existingFeeds) && existingFeeds.length > 0
        ? {
            FeedID: Number(existingFeeds[0].FeedID),
            Title: existingFeeds[0].Title,
          }
        : null;
    return NextResponse.json({
      success: true,
      message: "Feed checked successfully and could be processed",
      feedDetails: {
        title: feed.title,
        itemCount: feed.items.length,
        existingFeed: existing,
        publisherId: publisherId != null ? Number(publisherId) : null,
      },
    });
  } catch (error) {
    console.error("Debug add feed error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : null,
      stage: "unknown",
    });
  }
}
