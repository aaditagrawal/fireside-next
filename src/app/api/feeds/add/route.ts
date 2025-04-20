import { NextRequest, NextResponse } from "next/server";
import { processFeed } from "@/lib/rss-parser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, userId } = body;

    // Basic validation
    if (!url) {
      return NextResponse.json(
        { success: false, error: "Feed URL is required" },
        { status: 400 },
      );
    }

    // Process the feed
    const result = await processFeed(url, userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        feedId: Number(result.feedId),
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 },
      );
    }
  } catch (error: unknown) {
    console.error("Add feed error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while adding the feed" },
      { status: 500 },
    );
  }
}
