import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { executeQuery } from "@/lib/db";

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

    // Get parameters from request body
    const { categoryId } = await request.json();

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "Category ID is required" },
        { status: 400 },
      );
    }

    // Find the top feeds in this category the user isn't already subscribed to
    const query = `
      WITH CategoryFeeds AS (
        -- Get feeds in this category
        SELECT
          f.FeedID,
          f.Title,
          f.FeedURL,
          COUNT(fi.ItemID) AS ArticleCount,
          MAX(fi.PubDate) AS LastArticleDate
        FROM Feed_Categories fc
        JOIN Feeds f ON fc.FeedID = f.FeedID
        LEFT JOIN FeedItems fi ON f.FeedID = fi.FeedID
        WHERE fc.CategoryID = ?
        GROUP BY f.FeedID, f.Title, f.FeedURL
      ),

      UserSubscriptions AS (
        -- Check which feeds the user is already subscribed to
        SELECT FeedID
        FROM Subscriptions
        WHERE UserID = ?
      )

      -- Select feeds the user isn't subscribed to yet
      SELECT
        cf.FeedID,
        cf.Title,
        cf.FeedURL,
        cf.ArticleCount
      FROM CategoryFeeds cf
      LEFT JOIN UserSubscriptions us ON cf.FeedID = us.FeedID
      WHERE us.FeedID IS NULL
        AND cf.ArticleCount > 0
      ORDER BY
        -- Prioritize feeds with more content and recent updates
        cf.ArticleCount DESC,
        cf.LastArticleDate DESC
      LIMIT 5
    `;

    const feedsToSubscribe = await executeQuery({
      query: query,
      values: [categoryId, user.id],
    });

    if (!Array.isArray(feedsToSubscribe) || feedsToSubscribe.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No feeds found in this category or you're already subscribed to all available feeds",
        },
        { status: 404 },
      );
    }

    // Subscribe the user to these feeds
    const subscriptionResults = [];

    for (const feed of feedsToSubscribe) {
      try {
        // Insert the subscription
        await executeQuery({
          query:
            "INSERT IGNORE INTO Subscriptions (UserID, FeedID, SubscriptionDate) VALUES (?, ?, NOW())",
          values: [user.id, feed.FeedID],
        });

        subscriptionResults.push({
          feedId: feed.FeedID,
          title: feed.Title,
          success: true,
        });
      } catch (error) {
        console.error(
          `Error subscribing user ${user.id} to feed ${feed.FeedID}:`,
          error,
        );
        subscriptionResults.push({
          feedId: feed.FeedID,
          title: feed.Title,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Also add this category to user's recommendations with a high score to boost future recommendations
    try {
      await executeQuery({
        query: `
          INSERT INTO Recommendations (UserID, CategoryID, FrecencyScore, LastEngaged)
          VALUES (?, ?, 10, NOW())
          ON DUPLICATE KEY UPDATE
            FrecencyScore = FrecencyScore + 5,
            LastEngaged = NOW()
        `,
        values: [user.id, categoryId],
      });
    } catch (recError) {
      console.warn("Failed to update recommendations for category:", recError);
    }

    return NextResponse.json({
      success: true,
      message: `Subscribed to ${subscriptionResults.filter((r) => r.success).length} feeds in this category`,
      subscriptions: subscriptionResults,
    });
  } catch (error) {
    console.error("Category subscription error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
