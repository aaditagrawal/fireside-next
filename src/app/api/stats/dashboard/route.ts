import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { executeQuery } from "@/lib/db";

export async function GET(request: NextRequest) {
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

    // Get userId from query params and validate it matches the authenticated user
    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("userId");

    if (!userIdParam || parseInt(userIdParam) !== user.id) {
      return NextResponse.json(
        { success: false, error: "Invalid user ID" },
        { status: 400 },
      );
    }

    // Get total articles from subscribed feeds
    const totalArticlesQuery = `
      SELECT COUNT(DISTINCT fi.ItemID) as totalArticles
      FROM FeedItems fi
      JOIN Feeds f ON fi.FeedID = f.FeedID
      JOIN Subscriptions s ON f.FeedID = s.FeedID
      WHERE s.UserID = ?
    `;

    // Get read articles count
    const readArticlesQuery = `
      SELECT COUNT(DISTINCT ufi.ItemID) as readArticles
      FROM User_FeedItems ufi
      WHERE ufi.UserID = ? AND ufi.IsRead = 1
    `;

    // Get saved articles count
    const savedArticlesQuery = `
      SELECT COUNT(DISTINCT ufi.ItemID) as savedArticles
      FROM User_FeedItems ufi
      WHERE ufi.UserID = ? AND ufi.IsSaved = 1
    `;

    const subscriptionsQuery = `
      SELECT COUNT(DISTINCT s.FeedID) as subscriptions
      FROM Subscriptions s
      WHERE s.UserID = ?
    `;

    // Get articles read in the last 7 days
    const lastWeekReadsQuery = `
      SELECT COUNT(DISTINCT i.ItemID) as lastWeekReads
      FROM Interactions i
      WHERE i.UserID = ?
      AND i.Type = 'read'
      AND i.Timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;

    // Execute all queries in parallel for efficiency
    const [
      totalArticlesResult,
      readArticlesResult,
      savedArticlesResult,
      subscriptionsResult,
      lastWeekReadsResult,
    ] = await Promise.all([
      executeQuery({ query: totalArticlesQuery, values: [user.id] }),
      executeQuery({ query: readArticlesQuery, values: [user.id] }),
      executeQuery({ query: savedArticlesQuery, values: [user.id] }),
      executeQuery({ query: subscriptionsQuery, values: [user.id] }),
      executeQuery({ query: lastWeekReadsQuery, values: [user.id] }),
    ]);

    // Format the stats data
    const stats = {
      totalArticles: Array.isArray(totalArticlesResult)
        ? parseInt(totalArticlesResult[0]?.totalArticles || "0", 10)
        : 0,
      readArticles: Array.isArray(readArticlesResult)
        ? parseInt(readArticlesResult[0]?.readArticles || "0", 10)
        : 0,
      savedArticles: Array.isArray(savedArticlesResult)
        ? parseInt(savedArticlesResult[0]?.savedArticles || "0", 10)
        : 0,
      subscriptions: Array.isArray(subscriptionsResult)
        ? parseInt(subscriptionsResult[0]?.subscriptions || "0", 10)
        : 0,
      lastWeekReads: Array.isArray(lastWeekReadsResult)
        ? parseInt(lastWeekReadsResult[0]?.lastWeekReads || "0", 10)
        : 0,
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
