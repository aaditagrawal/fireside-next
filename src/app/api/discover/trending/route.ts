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

    // to find trending articles based on user interactions
    const query = `
      WITH InteractionCounts AS (
        SELECT
          i.ItemID,
          COUNT(DISTINCT i.InteractionID) AS InteractionCount,
          COUNT(DISTINCT i.UserID) AS UserCount,
          MAX(i.Timestamp) AS LatestInteraction
        FROM Interactions i
        WHERE i.Timestamp > DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY i.ItemID
      ),

      RankedArticles AS (
        SELECT
          ic.ItemID,
          ic.InteractionCount,
          ic.UserCount,
          ic.LatestInteraction,
          (
            (ic.InteractionCount * 0.5) +
            (ic.UserCount * 1.5) +
            (10 / (1 + TIMESTAMPDIFF(HOUR, ic.LatestInteraction, NOW())/24))
          ) AS TrendingScore,
          ROW_NUMBER() OVER (ORDER BY
            (ic.InteractionCount * 0.5) +
            (ic.UserCount * 1.5) +
            (10 / (1 + TIMESTAMPDIFF(HOUR, ic.LatestInteraction, NOW())/24))
            DESC
          ) AS TrendingRank
        FROM InteractionCounts ic
      ),

      ArticleDetails AS (
        SELECT
          fi.ItemID,
          fi.Title,
          fi.Content,
          fi.PubDate,
          fi.Link,
          f.FeedID,
          f.Title AS FeedTitle,
          COALESCE(ufi.IsRead, 0) AS IsRead,
          COALESCE(ufi.IsSaved, 0) AS IsSaved,
          ra.TrendingScore,
          GROUP_CONCAT(DISTINCT c.Name SEPARATOR ', ') AS CategoryName
        FROM RankedArticles ra
        JOIN FeedItems fi ON ra.ItemID = fi.ItemID
        JOIN Feeds f ON fi.FeedID = f.FeedID
        LEFT JOIN User_FeedItems ufi ON fi.ItemID = ufi.ItemID AND ufi.UserID = ?
        LEFT JOIN Feed_Categories fc ON f.FeedID = fc.FeedID
        LEFT JOIN Categories c ON fc.CategoryID = c.CategoryID
        WHERE ra.TrendingRank <= 12
        GROUP BY fi.ItemID, fi.Title, fi.Content, fi.PubDate, fi.Link,
                f.FeedID, f.Title, ufi.IsRead, ufi.IsSaved, ra.TrendingScore
        ORDER BY ra.TrendingRank
      )

      SELECT
        ad.*,
        GROUP_CONCAT(DISTINCT a.Name SEPARATOR ', ') AS Authors,
        p.Name AS PublisherName
      FROM ArticleDetails ad
      LEFT JOIN FeedItemAuthors fia ON ad.ItemID = fia.ItemID
      LEFT JOIN Authors a ON fia.AuthorID = a.AuthorID
      LEFT JOIN FeedItemPublishers fip ON ad.ItemID = fip.ItemID
      LEFT JOIN Publishers p ON fip.PublisherID = p.PublisherID
      GROUP BY ad.ItemID, ad.Title, ad.Content, ad.PubDate, ad.Link,
               ad.FeedID, ad.FeedTitle, ad.IsRead, ad.IsSaved, ad.TrendingScore, ad.CategoryName
      ORDER BY ad.TrendingScore DESC
    `;

    const articles = await executeQuery({
      query: query,
      values: [user.id],
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
          Score: parseFloat(article.TrendingScore || "0"),
        }))
      : [];

    return NextResponse.json({
      success: true,
      articles: formattedArticles,
    });
  } catch (error) {
    console.error("Trending discover error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
