import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { executeQuery } from "@/lib/db";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export async function GET(request: NextRequest) {
  try {
    // Validate session first
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

    // Get article ID from URL
    const searchParams = request.nextUrl.searchParams;
    const articleId = searchParams.get("id");

    if (!articleId || isNaN(parseInt(articleId, 10))) {
      return NextResponse.json(
        { success: false, error: "Invalid article ID" },
        { status: 400 },
      );
    }

    // Check if user has access to this article (subscribed to the feed)
    const accessCheck = await executeQuery({
      query: `
        SELECT 1
        FROM FeedItems fi
        JOIN Feeds f ON fi.FeedID = f.FeedID
        JOIN Subscriptions s ON f.FeedID = s.FeedID
        WHERE fi.ItemID = ? AND s.UserID = ?
        LIMIT 1
      `,
      values: [parseInt(articleId, 10), user.id],
    });

    if (!Array.isArray(accessCheck) || accessCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "You don't have access to this article" },
        { status: 403 },
      );
    }

    // Fetch article data with saved status
    const articleData = await executeQuery({
      query: `
        SELECT
          fi.ItemID, fi.Title, fi.Content, fi.PubDate, fi.Link, fi.IsRead,
          COALESCE(ufi.IsSaved, 0) AS IsSaved,
          f.FeedID, f.Title as FeedTitle,
          GROUP_CONCAT(DISTINCT a.Name SEPARATOR ', ') as Authors,
          p.Name as PublisherName
        FROM FeedItems fi
        JOIN Feeds f ON fi.FeedID = f.FeedID
        LEFT JOIN User_FeedItems ufi ON fi.ItemID = ufi.ItemID AND ufi.UserID = ?
        LEFT JOIN FeedItemAuthors fia ON fi.ItemID = fia.ItemID
        LEFT JOIN Authors a ON fia.AuthorID = a.AuthorID
        LEFT JOIN FeedItemPublishers fip ON fi.ItemID = fip.ItemID
        LEFT JOIN Publishers p ON fip.PublisherID = p.PublisherID
        WHERE fi.ItemID = ?
        GROUP BY fi.ItemID
      `,
      values: [user.id, parseInt(articleId, 10)],
    });

    if (!Array.isArray(articleData) || articleData.length === 0) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 },
      );
    }

    // Mark article as read
    await executeQuery({
      query: "UPDATE FeedItems SET IsRead = 1 WHERE ItemID = ?",
      values: [parseInt(articleId, 10)],
    });

    // Format dates and content
    const base = articleData[0];
    let contentHtml = base.Content;
    // Always fetch full article for complete content
    try {
      const res = await fetch(base.Link);
      if (res.ok) {
        const html = await res.text();
        const dom = new JSDOM(html, { url: base.Link });
        const reader = new Readability(dom.window.document);
        const parsed = reader.parse();
        if (parsed?.content) {
          contentHtml = parsed.content;
          // Update DB with full content
          await executeQuery({
            query: "UPDATE FeedItems SET Content = ? WHERE ItemID = ?",
            values: [contentHtml, base.ItemID],
          });
        }
      }
    } catch (err) {
      console.error("Error fetching full article:", err);
    }

    // Fetch like count and user like status
    const likeResult = await executeQuery({
      query: "SELECT COUNT(*) as LikeCount FROM Interactions WHERE ItemID = ? AND Type = ?",
      values: [base.ItemID, "like"],
    });
    const likeCount =
      Array.isArray(likeResult) && likeResult.length > 0
        ? Number((likeResult[0] as any).LikeCount)
        : 0;
    const userLikedResult = await executeQuery({
      query: "SELECT COUNT(*) as cnt FROM Interactions WHERE ItemID = ? AND UserID = ? AND Type = ?",
      values: [base.ItemID, user.id, "like"],
    });
    const userLiked =
      Array.isArray(userLikedResult) &&
      userLikedResult.length > 0 &&
      Number((userLikedResult[0] as any).cnt) > 0;

    const article = {
      ...base,
      Content: contentHtml,
      PubDate: base.PubDate ? new Date(base.PubDate).toISOString() : null,
      IsSaved: base.IsSaved === 1,
      LikeCount: likeCount,
      UserLiked: userLiked,
    };

    return NextResponse.json({ success: true, article });
  } catch (error: unknown) {
    console.error("Fetch article error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching the article",
      },
      { status: 500 },
    );
  }
}
