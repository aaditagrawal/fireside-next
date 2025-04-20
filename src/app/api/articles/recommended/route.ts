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

    // Recommended articles based on user's interests (categories)
    const query = `
      WITH UserInterests AS (
        -- First find categories the user engages with
        SELECT
          c.CategoryID,
          c.Name AS CategoryName,
          r.FrecencyScore
        FROM Recommendations r
        JOIN Categories c ON r.CategoryID = c.CategoryID
        WHERE r.UserID = ?
        ORDER BY r.FrecencyScore DESC
        LIMIT 5
      ),

      RecommendedArticles AS (
        -- Find recent articles from their subscriptions in those categories
        SELECT DISTINCT
          fi.ItemID,
          fi.Title,
          fi.Content,
          fi.PubDate,
          fi.Link,
          f.FeedID,
          f.Title AS FeedTitle,
          ui.CategoryName,
          ui.FrecencyScore,
          COALESCE(ufi.IsRead, 0) AS IsRead,
          COALESCE(ufi.IsSaved, 0) AS IsSaved,
          -- Scoring algorithm combining category preference and recency
          (ui.FrecencyScore * (1 / (1 + TIMESTAMPDIFF(HOUR, fi.PubDate, NOW())/24))) AS RecommendationScore
        FROM UserInterests ui
        JOIN Feed_Categories fc ON ui.CategoryID = fc.CategoryID
        JOIN Feeds f ON fc.FeedID = f.FeedID
        JOIN Subscriptions s ON f.FeedID = s.FeedID
        JOIN FeedItems fi ON f.FeedID = fi.FeedID
        LEFT JOIN User_FeedItems ufi ON fi.ItemID = ufi.ItemID AND ufi.UserID = ?
        WHERE s.UserID = ?
          AND (ufi.IsRead IS NULL OR ufi.IsRead = 0) -- Unread articles only
          AND fi.PubDate > DATE_SUB(NOW(), INTERVAL 7 DAY) -- Last week's articles
      )

      SELECT
        ra.ItemID,
        ra.Title,
        ra.Content,
        ra.PubDate,
        ra.Link,
        ra.IsRead,
        ra.IsSaved,
        ra.FeedID,
        ra.FeedTitle,
        ra.CategoryName,
        GROUP_CONCAT(DISTINCT a.Name SEPARATOR ', ') AS Authors,
        p.Name AS PublisherName,
        ra.RecommendationScore
      FROM RecommendedArticles ra
      LEFT JOIN FeedItemAuthors fia ON ra.ItemID = fia.ItemID
      LEFT JOIN Authors a ON fia.AuthorID = a.AuthorID
      LEFT JOIN FeedItemPublishers fip ON ra.ItemID = fip.ItemID
      LEFT JOIN Publishers p ON fip.PublisherID = p.PublisherID
      GROUP BY ra.ItemID, ra.Title, ra.Content, ra.PubDate, ra.Link, ra.IsRead, ra.IsSaved,
               ra.FeedID, ra.FeedTitle, ra.CategoryName, ra.RecommendationScore
      ORDER BY ra.RecommendationScore DESC
      LIMIT 10
    `;

    // Fallback query for when we don't have enough recommendations
    const fallbackQuery = `
      -- Fallback for users without enough interests/recommendations
      SELECT
        fi.ItemID,
        fi.Title,
        fi.Content,
        fi.PubDate,
        fi.Link,
        COALESCE(ufi.IsRead, 0) AS IsRead,
        COALESCE(ufi.IsSaved, 0) AS IsSaved,
        f.FeedID,
        f.Title AS FeedTitle,
        c.Name AS CategoryName,
        GROUP_CONCAT(DISTINCT a.Name SEPARATOR ', ') AS Authors,
        p.Name AS PublisherName,
        -- Simple score based on recency
        (1 / (1 + TIMESTAMPDIFF(HOUR, fi.PubDate, NOW())/24)) AS RecommendationScore
      FROM FeedItems fi
      JOIN Feeds f ON fi.FeedID = f.FeedID
      JOIN Subscriptions s ON f.FeedID = s.FeedID
      LEFT JOIN User_FeedItems ufi ON fi.ItemID = ufi.ItemID AND ufi.UserID = ?
      LEFT JOIN FeedItemAuthors fia ON fi.ItemID = fia.ItemID
      LEFT JOIN Authors a ON fia.AuthorID = a.AuthorID
      LEFT JOIN FeedItemPublishers fip ON fi.ItemID = fip.ItemID
      LEFT JOIN Publishers p ON fip.PublisherID = p.PublisherID
      LEFT JOIN Feed_Categories fc ON f.FeedID = fc.FeedID
      LEFT JOIN Categories c ON fc.CategoryID = c.CategoryID
      WHERE s.UserID = ?
        AND (ufi.IsRead IS NULL OR ufi.IsRead = 0) -- Unread articles
        AND fi.PubDate > DATE_SUB(NOW(), INTERVAL 7 DAY) -- Last week
      GROUP BY fi.ItemID, fi.Title, fi.Content, fi.PubDate, fi.Link, ufi.IsRead, ufi.IsSaved,
               f.FeedID, f.Title, c.Name, p.Name, fi.PubDate
      ORDER BY fi.PubDate DESC
      LIMIT 10
    `;

    // First try to get personalized recommendations
    let articles = await executeQuery({
      query: query,
      values: [user.id, user.id, user.id],
    });

    // If we don't have enough, use the fallback
    if (!Array.isArray(articles) || articles.length < 5) {
      articles = await executeQuery({
        query: fallbackQuery,
        values: [user.id, user.id],
      });
    }

    // Format articles
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
          Score: parseFloat(article.RecommendationScore || "0"),
        }))
      : [];

    return NextResponse.json({
      success: true,
      articles: formattedArticles,
    });
  } catch (error) {
    console.error("Recommended articles error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
