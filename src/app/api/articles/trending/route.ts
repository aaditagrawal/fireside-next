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

    // Trending algorithm based on recent interactions from all users
    const query = `
      WITH ArticleInteractions AS (
        SELECT
          fi.ItemID,
          fi.Title,
          fi.Content,
          fi.PubDate,
          fi.Link,
          (SELECT IsRead FROM User_FeedItems WHERE UserID = ? AND ItemID = fi.ItemID) AS IsRead,
          (SELECT IsSaved FROM User_FeedItems WHERE UserID = ? AND ItemID = fi.ItemID) AS IsSaved,
          f.FeedID,
          f.Title AS FeedTitle,
          COUNT(DISTINCT i.InteractionID) AS InteractionCount,
          (
            -- Calculate a score based on recency and interaction count
            COUNT(DISTINCT i.InteractionID) *
            (1 / (1 + TIMESTAMPDIFF(HOUR, MAX(i.Timestamp), NOW())/24))
          ) AS TrendingScore
        FROM FeedItems fi
        JOIN Feeds f ON fi.FeedID = f.FeedID
        JOIN Subscriptions s ON f.FeedID = s.FeedID
        JOIN Interactions i ON fi.ItemID = i.ItemID
        WHERE s.UserID = ?
          AND i.Timestamp > DATE_SUB(NOW(), INTERVAL 3 DAY)
        GROUP BY fi.ItemID, fi.Title, fi.Content, fi.PubDate, fi.Link, f.FeedID, f.Title
      )

      SELECT
        ai.ItemID,
        ai.Title,
        ai.Content,
        ai.PubDate,
        ai.Link,
        COALESCE(ai.IsRead, 0) AS IsRead,
        COALESCE(ai.IsSaved, 0) AS IsSaved,
        ai.FeedID,
        ai.FeedTitle,
        GROUP_CONCAT(DISTINCT a.Name SEPARATOR ', ') AS Authors,
        p.Name AS PublisherName,
        c.Name AS CategoryName,
        ai.TrendingScore
      FROM ArticleInteractions ai
      LEFT JOIN FeedItemAuthors fia ON ai.ItemID = fia.ItemID
      LEFT JOIN Authors a ON fia.AuthorID = a.AuthorID
      LEFT JOIN FeedItemPublishers fip ON ai.ItemID = fip.ItemID
      LEFT JOIN Publishers p ON fip.PublisherID = p.PublisherID
      LEFT JOIN Feed_Categories fc ON ai.FeedID = fc.FeedID
      LEFT JOIN Categories c ON fc.CategoryID = c.CategoryID
      GROUP BY ai.ItemID, ai.Title, ai.Content, ai.PubDate, ai.Link, ai.IsRead, ai.IsSaved,
               ai.FeedID, ai.FeedTitle, p.Name, c.Name, ai.TrendingScore
      ORDER BY ai.TrendingScore DESC
      LIMIT 10
    `;

    const articles = await executeQuery({
      query: query,
      values: [user.id, user.id, user.id],
    });

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
          Score: parseFloat(article.TrendingScore || "0"),
        }))
      : [];

    return NextResponse.json({
      success: true,
      articles: formattedArticles,
    });
  } catch (error) {
    console.error("Trending articles error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
