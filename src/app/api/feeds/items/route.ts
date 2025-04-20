import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { validateSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    // Validate session first
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

    // Get parameters from URL
    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("userId"); // Still used for validation
    const feedIdParam = searchParams.get("feedId"); // Optional feed filter
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Validate userId matches authenticated user
    if (!userIdParam || parseInt(userIdParam, 10) !== user.id) {
      return NextResponse.json(
        { success: false, error: "User ID mismatch or missing" },
        { status: 400 },
      );
    }

    // Construct the query - now using User_FeedItems for read status
    let query = `
      SELECT
        fi.ItemID, fi.Title, fi.Content, fi.PubDate, fi.Link,
        COALESCE(ufi.IsRead, 0) AS IsRead,
        f.FeedID, f.Title as FeedTitle,
        GROUP_CONCAT(DISTINCT a.Name SEPARATOR ', ') as Authors,
        p.Name as PublisherName
      FROM FeedItems fi
      JOIN Feeds f ON fi.FeedID = f.FeedID
      JOIN Subscriptions s ON f.FeedID = s.FeedID
      LEFT JOIN User_FeedItems ufi ON fi.ItemID = ufi.ItemID AND ufi.UserID = ?
      LEFT JOIN FeedItemAuthors fia ON fi.ItemID = fia.ItemID
      LEFT JOIN Authors a ON fia.AuthorID = a.AuthorID
      LEFT JOIN FeedItemPublishers fip ON fi.ItemID = fip.ItemID
      LEFT JOIN Publishers p ON fip.PublisherID = p.PublisherID
      WHERE s.UserID = ?
    `;
    const values: (number | string)[] = [user.id, user.id];

    // Add feed filter if feedId is provided
    if (feedIdParam) {
      const feedId = parseInt(feedIdParam, 10);
      if (isNaN(feedId)) {
        return NextResponse.json(
          { success: false, error: "Invalid Feed ID" },
          { status: 400 },
        );
      }
      query += ` AND fi.FeedID = ?`;
      values.push(feedId);
    }

    query += `
      GROUP BY fi.ItemID, f.FeedID, f.Title, p.Name, ufi.IsRead  # Added ufi.IsRead to GROUP BY
      ORDER BY fi.PubDate DESC, fi.ItemID DESC
      LIMIT ? OFFSET ?
    `;
    values.push(limit, offset);

    // Execute the query
    const items = await executeQuery({ query, values });

    // Ensure items is an array
    const resultsArray = Array.isArray(items) ? items : [];

    // Format dates consistently before sending to client
    const formattedItems = resultsArray.map((item) => ({
      ...item,
      PubDate: item.PubDate ? new Date(item.PubDate).toISOString() : null,
      IsRead: item.IsRead === 1, // Convert to boolean
    }));

    return NextResponse.json({
      success: true,
      items: formattedItems,
    });
  } catch (error: unknown) {
    console.error("Fetch feed items error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching feed items",
      },
      { status: 500 },
    );
  }
}
