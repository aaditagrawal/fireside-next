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

    // Get saved articles
    const query = `
      SELECT
        fi.ItemID,
        fi.Title,
        fi.Content,
        fi.PubDate,
        fi.Link,
        1 AS IsRead,
        1 AS IsSaved,
        f.FeedID,
        f.Title AS FeedTitle,
        GROUP_CONCAT(DISTINCT a.Name SEPARATOR ', ') AS Authors,
        p.Name AS PublisherName,
        c.Name AS CategoryName,
        ufi.LastInteractionAt
      FROM User_FeedItems ufi
      JOIN FeedItems fi ON ufi.ItemID = fi.ItemID
      JOIN Feeds f ON fi.FeedID = f.FeedID
      LEFT JOIN FeedItemAuthors fia ON fi.ItemID = fia.ItemID
      LEFT JOIN Authors a ON fia.AuthorID = a.AuthorID
      LEFT JOIN FeedItemPublishers fip ON fi.ItemID = fip.ItemID
      LEFT JOIN Publishers p ON fip.PublisherID = p.PublisherID
      LEFT JOIN Feed_Categories fc ON f.FeedID = fc.FeedID
      LEFT JOIN Categories c ON fc.CategoryID = c.CategoryID
      WHERE ufi.UserID = ? AND ufi.IsSaved = 1
      GROUP BY fi.ItemID, fi.Title, fi.Content, fi.PubDate, fi.Link,
               f.FeedID, f.Title, p.Name, c.Name, ufi.LastInteractionAt
      ORDER BY ufi.LastInteractionAt DESC
      LIMIT 10
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
          IsRead: true,
          IsSaved: true,
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
    console.error("Saved articles error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
