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

    // Get userId from query params
    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("userId");

    if (!userIdParam || parseInt(userIdParam) !== user.id) {
      return NextResponse.json(
        { success: false, error: "Invalid user ID" },
        { status: 400 },
      );
    }

    // Current month distribution
    const currentDistributionQuery = `
      SELECT
        c.Name as category,
        COUNT(DISTINCT i.ItemID) as count
      FROM Interactions i
      JOIN FeedItems fi ON i.ItemID = fi.ItemID
      JOIN Feeds f ON fi.FeedID = f.FeedID
      JOIN Feed_Categories fc ON f.FeedID = fc.FeedID
      JOIN Categories c ON fc.CategoryID = c.CategoryID
      WHERE i.UserID = ?
        AND i.Type IN ('read', 'save')
        AND i.Timestamp >= DATE_FORMAT(NOW() ,'%Y-%m-01')
      GROUP BY c.Name
      ORDER BY count DESC
      LIMIT 6
    `;

    // Previous month distribution for trend calculation
    const previousDistributionQuery = `
      SELECT
        c.Name as category,
        COUNT(DISTINCT i.ItemID) as count
      FROM Interactions i
      JOIN FeedItems fi ON i.ItemID = fi.ItemID
      JOIN Feeds f ON fi.FeedID = f.FeedID
      JOIN Feed_Categories fc ON f.FeedID = fc.FeedID
      JOIN Categories c ON fc.CategoryID = c.CategoryID
      WHERE i.UserID = ?
        AND i.Type IN ('read', 'save')
        AND i.Timestamp >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH) ,'%Y-%m-01')
        AND i.Timestamp < DATE_FORMAT(NOW() ,'%Y-%m-01')
      GROUP BY c.Name
      ORDER BY count DESC
    `;

    // Execute both queries
    const [currentDistribution, previousDistribution] = await Promise.all([
      executeQuery({
        query: currentDistributionQuery,
        values: [user.id],
      }),
      executeQuery({
        query: previousDistributionQuery,
        values: [user.id],
      }),
    ]);

    // Format categories for radar chart
    const categories = Array.isArray(currentDistribution)
      ? currentDistribution.map((category) => ({
          category: category.category,
          count: parseInt(category.count, 10),
        }))
      : [];

    // Calculate trend
    let trend = {
      percentage: 0,
      increasing: true,
    };

    if (
      Array.isArray(currentDistribution) &&
      Array.isArray(previousDistribution)
    ) {
      const currentTotal = currentDistribution.reduce(
        (sum, item) => sum + parseInt(item.count, 10),
        0,
      );
      const previousTotal = previousDistribution.reduce(
        (sum, item) => sum + parseInt(item.count, 10),
        0,
      );

      if (previousTotal > 0) {
        const percentageChange =
          ((currentTotal - previousTotal) / previousTotal) * 100;
        trend = {
          percentage: Math.abs(percentageChange),
          increasing: percentageChange >= 0,
        };
      }
    }

    return NextResponse.json({
      success: true,
      categories,
      trend,
    });
  } catch (error) {
    console.error("Category distribution stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
