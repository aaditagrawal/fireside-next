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

    // Recent articles from user's subscriptions
    const query = `
      SELECT DISTINCT
        fi.ItemID,
        fi.Title,
        fi.Content,
        fi.PubDate,
        fi.Link,
        COALESCE(ufi.IsRead, 0) AS IsRead,
        COALESCE(ufi.IsSaved, 0) AS IsSaved,
        f.FeedID,
        f.Title AS FeedTitle,
        GROUP_CONCAT(DISTINCT a.Name SEPARATOR ', ') AS Authors,
        p.Name AS PublisherName,
        GROUP_CONCAT(DISTINCT c.Name SEPARATOR ', ') AS CategoryName
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
      GROUP BY fi.ItemID, fi.Title, fi.Content, fi.PubDate, fi.Link, ufi.IsRead, ufi.IsSaved,
               f.FeedID, f.Title, p.Name
      ORDER BY fi.PubDate DESC, fi.ItemID DESC
      LIMIT 15
    `;

    const articles = await executeQuery({
      query: query,
      values: [user.id, user.id],
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
        }))
      : [];

    return NextResponse.json({
      success: true,
      articles: formattedArticles,
    });
  } catch (error) {
    console.error("Recent articles error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
