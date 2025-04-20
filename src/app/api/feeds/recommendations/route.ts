import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { executeQuery } from "@/lib/db";
import { generateRecommendations } from "@/lib/feed-processor";

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

    // Regenerate recommendations to ensure they're fresh
    try {
      await generateRecommendations(user.id);
    } catch (recError) {
      console.warn(
        "Failed to generate fresh recommendations, using existing ones:",
        recError,
      );
    }

    // Get recommended feeds based on user's category interests
    const recommendationsQuery = `
      WITH UserCategories AS (
        -- Find categories the user has engaged with
        SELECT
          c.CategoryID,
          c.Name AS CategoryName,
          r.FrecencyScore
        FROM Recommendations r
        JOIN Categories c ON r.CategoryID = c.CategoryID
        WHERE r.UserID = ?
        ORDER BY r.FrecencyScore DESC
        LIMIT 10
      ),

      UserSubscriptions AS (
        -- Get feeds user is already subscribed to
        SELECT FeedID
        FROM Subscriptions
        WHERE UserID = ?
      )

      -- Find feeds that match user's interests but aren't subscribed
      SELECT DISTINCT
        f.FeedID,
        f.Title,
        f.Description,
        f.FeedURL,
        f.LastFetchedAt,
        uc.FrecencyScore,
        uc.CategoryName,
        (
          SELECT COUNT(*)
          FROM FeedItems fi
          WHERE fi.FeedID = f.FeedID
        ) AS ItemCount
      FROM UserCategories uc
      JOIN Feed_Categories fc ON uc.CategoryID = fc.CategoryID
      JOIN Feeds f ON fc.FeedID = f.FeedID
      LEFT JOIN UserSubscriptions us ON f.FeedID = us.FeedID
      WHERE us.FeedID IS NULL -- Only feeds the user is not subscribed to
      ORDER BY uc.FrecencyScore DESC, RAND() -- Using frecency score and randomization
      LIMIT 15
    `;

    const fallbackQuery = `
      -- Fallback when user doesn't have recommendations
      WITH UserSubscriptions AS (
        -- Get feeds user is already subscribed to
        SELECT FeedID
        FROM Subscriptions
        WHERE UserID = ?
      ),

      PopularFeeds AS (
        -- Get popular feeds based on subscription count
        SELECT
          f.FeedID,
          COUNT(DISTINCT s.UserID) AS SubscriberCount
        FROM Feeds f
        JOIN Subscriptions s ON f.FeedID = s.FeedID
        GROUP BY f.FeedID
        ORDER BY SubscriberCount DESC
        LIMIT 20
      )

      -- Find popular feeds the user isn't subscribed to
      SELECT DISTINCT
        f.FeedID,
        f.Title,
        f.Description,
        f.FeedURL,
        f.LastFetchedAt,
        pf.SubscriberCount / 10 AS FrecencyScore,
        c.Name AS CategoryName,
        (
          SELECT COUNT(*)
          FROM FeedItems fi
          WHERE fi.FeedID = f.FeedID
        ) AS ItemCount
      FROM PopularFeeds pf
      JOIN Feeds f ON pf.FeedID = f.FeedID
      LEFT JOIN Feed_Categories fc ON f.FeedID = fc.FeedID
      LEFT JOIN Categories c ON fc.CategoryID = c.CategoryID
      LEFT JOIN UserSubscriptions us ON f.FeedID = us.FeedID
      WHERE us.FeedID IS NULL -- Only feeds the user is not subscribed to
      ORDER BY pf.SubscriberCount DESC
      LIMIT 10
    `;

    // Try to get personalized recommendations first
    let recommendations = await executeQuery({
      query: recommendationsQuery,
      values: [user.id, user.id],
    });

    // If no personalized recommendations, fall back to popular feeds
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      recommendations = await executeQuery({
        query: fallbackQuery,
        values: [user.id],
      });
    }

    // Format the recommendations
    const formattedRecommendations = Array.isArray(recommendations)
      ? recommendations.map((rec) => ({
          FeedID: rec.FeedID,
          Title: rec.Title || "Untitled Feed",
          Description: rec.Description || "",
          FeedURL: rec.FeedURL,
          LastFetchedAt: rec.LastFetchedAt
            ? new Date(rec.LastFetchedAt).toISOString()
            : null,
          FrecencyScore: parseFloat(rec.FrecencyScore || "0"),
          CategoryName: rec.CategoryName || "Uncategorized",
          ItemCount: parseInt(rec.ItemCount || "0", 10),
        }))
      : [];

    return NextResponse.json({
      success: true,
      recommendations: formattedRecommendations,
    });
  } catch (error) {
    console.error("Feed recommendations error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
