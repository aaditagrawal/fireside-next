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

    // Complex nested query to find similar users and their favorites
    // This uses multiple CTEs, window functions, and advanced SQL techniques
    const query = `
      WITH UserCategoryInterests AS (
        -- Calculate each user's category interests based on their interactions
        SELECT
          u.UserID,
          fc.CategoryID,
          COUNT(DISTINCT i.ItemID) AS CategoryInteractionCount
        FROM Users u
        JOIN Interactions i ON u.UserID = i.UserID
        JOIN FeedItems fi ON i.ItemID = fi.ItemID
        JOIN Feeds f ON fi.FeedID = f.FeedID
        JOIN Feed_Categories fc ON f.FeedID = fc.FeedID
        WHERE i.Timestamp > DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY u.UserID, fc.CategoryID
      ),

      UserSimilarityScores AS (
        SELECT
          ? AS TargetUserID, -- Our user
          uci_other.UserID AS OtherUserID,
          SUM(
            CASE
              WHEN uci_target.CategoryID IS NOT NULL AND uci_other.CategoryID IS NOT NULL THEN
                (uci_target.CategoryInteractionCount * uci_other.CategoryInteractionCount) /
                (SQRT(POW(uci_target.CategoryInteractionCount, 2)) * SQRT(POW(uci_other.CategoryInteractionCount, 2)))
              ELSE 0
            END
          ) AS SimilarityScore
        FROM UserCategoryInterests uci_target
        JOIN UserCategoryInterests uci_other ON uci_target.CategoryID = uci_other.CategoryID
        WHERE uci_target.UserID = ? AND uci_other.UserID != ?
        GROUP BY uci_other.UserID
        HAVING SimilarityScore > 0
        ORDER BY SimilarityScore DESC
        LIMIT 20
      ),

      PopularArticlesAmongSimilarUsers AS (
        SELECT
          i.ItemID,
          COUNT(DISTINCT i.UserID) AS UserCount,
          SUM(
            CASE
              WHEN i.Type = 'save' THEN 3
              WHEN i.Type = 'like' THEN 2
              WHEN i.Type = 'read' THEN 1
              ELSE 0
            END
          ) AS WeightedInteractionScore,
          MAX(uss.SimilarityScore) AS MaxSimilarityScore,
          (
            COUNT(DISTINCT i.UserID) *
            SUM(
              CASE
                WHEN i.Type = 'save' THEN 3
                WHEN i.Type = 'like' THEN 2
                WHEN i.Type = 'read' THEN 1
                ELSE 0
              END
            ) *
            MAX(uss.SimilarityScore)
          ) AS RelevanceScore
        FROM Interactions i
        JOIN UserSimilarityScores uss ON i.UserID = uss.OtherUserID
        WHERE i.Timestamp > DATE_SUB(NOW(), INTERVAL 14 DAY)
        GROUP BY i.ItemID
        ORDER BY RelevanceScore DESC
        LIMIT 20
      ),

      UserInteractions AS (
        SELECT DISTINCT ItemID
        FROM Interactions
        WHERE UserID = ?
        UNION
        SELECT DISTINCT ItemID
        FROM User_FeedItems
        WHERE UserID = ? AND IsRead = 1
      )

      SELECT
        fi.ItemID,
        fi.Title,
        fi.Content,
        fi.PubDate,
        fi.Link,
        pasu.RelevanceScore,
        pasu.UserCount,
        COALESCE(ufi.IsRead, 0) AS IsRead,
        COALESCE(ufi.IsSaved, 0) AS IsSaved,
        f.FeedID,
        f.Title AS FeedTitle,
        GROUP_CONCAT(DISTINCT a.Name SEPARATOR ', ') AS Authors,
        p.Name AS PublisherName,
        GROUP_CONCAT(DISTINCT c.Name SEPARATOR ', ') AS CategoryName
      FROM PopularArticlesAmongSimilarUsers pasu
      JOIN FeedItems fi ON pasu.ItemID = fi.ItemID
      JOIN Feeds f ON fi.FeedID = f.FeedID
      LEFT JOIN UserInteractions ui ON fi.ItemID = ui.ItemID
      LEFT JOIN User_FeedItems ufi ON fi.ItemID = ufi.ItemID AND ufi.UserID = ?
      LEFT JOIN FeedItemAuthors fia ON fi.ItemID = fia.ItemID
      LEFT JOIN Authors a ON fia.AuthorID = a.AuthorID
      LEFT JOIN FeedItemPublishers fip ON fi.ItemID = fip.ItemID
      LEFT JOIN Publishers p ON fip.PublisherID = p.PublisherID
      LEFT JOIN Feed_Categories fc ON f.FeedID = fc.FeedID
      LEFT JOIN Categories c ON fc.CategoryID = c.CategoryID
      WHERE ui.ItemID IS NULL -- Only articles the user hasn't interacted with
      GROUP BY fi.ItemID, fi.Title, fi.Content, fi.PubDate, fi.Link,
               pasu.RelevanceScore, pasu.UserCount, ufi.IsRead, ufi.IsSaved, f.FeedID, f.Title
      ORDER BY pasu.RelevanceScore DESC
      LIMIT 12
    `;

    const articles = await executeQuery({
      query: query,
      values: [user.id, user.id, user.id, user.id, user.id, user.id],
    });

    const formattedArticles = Array.isArray(articles)
      ? articles.map((article) => ({
          ItemID: article.ItemID,
          Title: article.Title || "Untitled Article",
          Content: article.Content || "",
          PubDate: article.PubDate
            ? new Date(article.PubDate).toISOString()
            : null,
          Link: article.Link || "",
          IsRead: article.IsRead === 1,
          IsSaved: article.IsSaved === 1,
          FeedID: article.FeedID,
          FeedTitle: article.FeedTitle || "Unknown Feed",
          Authors: article.Authors || "",
          PublisherName: article.PublisherName || "",
          CategoryName: article.CategoryName || "Uncategorized",
          Score: parseFloat(article.RelevanceScore || "0"),
          SimilarUserCount: parseInt(article.UserCount || "0", 10),
        }))
      : [];

    return NextResponse.json({
      success: true,
      articles: formattedArticles,
    });
  } catch (error) {
    console.error("Similar users discover error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
