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

    // Complex query to detect emerging topics using time-based trends
    // Uses window functions and nested CTEs
    const query = `
      WITH CategoryHistory AS (
        SELECT
          fc.CategoryID,
          COUNT(DISTINCT fi.ItemID) AS PastArticleCount
        FROM Feed_Categories fc
        JOIN Feeds f ON fc.FeedID = f.FeedID
        JOIN FeedItems fi ON f.FeedID = fi.FeedID
        WHERE fi.PubDate BETWEEN DATE_SUB(NOW(), INTERVAL 30 DAY) AND DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY fc.CategoryID
      ),

      RecentCategoryActivity AS (
        SELECT
          fc.CategoryID,
          COUNT(DISTINCT fi.ItemID) AS RecentArticleCount
        FROM Feed_Categories fc
        JOIN Feeds f ON fc.FeedID = f.FeedID
        JOIN FeedItems fi ON f.FeedID = fi.FeedID
        WHERE fi.PubDate > DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY fc.CategoryID
      ),

      CategoryGrowth AS (
        SELECT
          c.CategoryID,
          c.Name AS CategoryName,
          c.Description,
          COALESCE(rca.RecentArticleCount, 0) AS RecentArticleCount,
          COALESCE(ch.PastArticleCount, 0) AS PastArticleCount,
          CASE
            WHEN COALESCE(ch.PastArticleCount, 0) = 0 THEN
              COALESCE(rca.RecentArticleCount, 0)
            ELSE
              (COALESCE(rca.RecentArticleCount, 0) - COALESCE(ch.PastArticleCount, 0)) /
              COALESCE(ch.PastArticleCount, 1) * 100
          END AS GrowthRate,
          EXISTS (
            SELECT 1
            FROM Subscriptions s
            JOIN Feeds f ON s.FeedID = f.FeedID
            JOIN Feed_Categories fc ON f.FeedID = fc.FeedID
            WHERE s.UserID = ? AND fc.CategoryID = c.CategoryID
          ) AS IsSubscribed
        FROM Categories c
        LEFT JOIN RecentCategoryActivity rca ON c.CategoryID = rca.CategoryID
        LEFT JOIN CategoryHistory ch ON c.CategoryID = ch.CategoryID
        WHERE
          COALESCE(rca.RecentArticleCount, 0) > 0 OR COALESCE(ch.PastArticleCount, 0) > 0
      ),

      UserCategoryInteractions AS (
        SELECT
          fc.CategoryID,
          COUNT(DISTINCT i.InteractionID) AS InteractionCount
        FROM Interactions i
        JOIN FeedItems fi ON i.ItemID = fi.ItemID
        JOIN Feeds f ON fi.FeedID = f.FeedID
        JOIN Feed_Categories fc ON f.FeedID = fc.FeedID
        WHERE i.UserID = ? AND i.Timestamp > DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY fc.CategoryID
      ),

      EmergingCategories AS (
        SELECT
          cg.CategoryID,
          cg.CategoryName,
          cg.Description,
          cg.RecentArticleCount,
          cg.PastArticleCount,
          cg.GrowthRate,
          cg.IsSubscribed,
          COALESCE(uci.InteractionCount, 0) AS UserInteractionCount,
          (
            CASE
              WHEN COALESCE(uci.InteractionCount, 0) > 0 THEN
                (cg.GrowthRate * 1.2) + (COALESCE(uci.InteractionCount, 0) * 2)
              WHEN cg.PastArticleCount = 0 AND cg.RecentArticleCount > 3 THEN
                cg.RecentArticleCount * 5
              ELSE
                cg.GrowthRate
            END
          ) AS EmergingScore,
          COALESCE((cg.RecentArticleCount + cg.PastArticleCount), 0) AS TotalArticleCount
        FROM CategoryGrowth cg
        LEFT JOIN UserCategoryInteractions uci ON cg.CategoryID = uci.CategoryID
        WHERE cg.IsSubscribed = 0
      )

      SELECT
        ec.CategoryID,
        ec.CategoryName,
        ec.Description,
        ec.RecentArticleCount,
        ec.GrowthRate,
        ec.TotalArticleCount AS ArticleCount,
        ec.EmergingScore,
        COALESCE(uc.Name, ec.CategoryName) AS ParentCategory
      FROM EmergingCategories ec
      LEFT JOIN Categories uc ON ec.CategoryID = uc.ParentCategoryID
      WHERE ec.EmergingScore > 0
      ORDER BY ec.EmergingScore DESC
      LIMIT 9
    `;

    const topics = await executeQuery({
      query: query,
      values: [user.id, user.id],
    });

    const formattedTopics = Array.isArray(topics)
      ? topics.map((topic) => ({
          CategoryID: topic.CategoryID,
          CategoryName: topic.CategoryName,
          Description: topic.Description,
          RecentArticleCount: parseInt(topic.RecentArticleCount || "0", 10),
          GrowthRate: parseFloat(topic.GrowthRate || "0").toFixed(1),
          ArticleCount: parseInt(topic.ArticleCount || "0", 10),
          EmergingScore: parseFloat(topic.EmergingScore || "0").toFixed(1),
          ParentCategory: topic.ParentCategory,
        }))
      : [];

    return NextResponse.json({
      success: true,
      topics: formattedTopics,
    });
  } catch (error) {
    console.error("Emerging topics discover error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
