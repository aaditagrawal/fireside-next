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

    // Generate a 7-day activity report
    // This query gets the count of read articles per day for the last 7 days
    const activityQuery = `
      SELECT
        DATE(i.Timestamp) as day,
        COUNT(DISTINCT i.ItemID) as count
      FROM Interactions i
      WHERE i.UserID = ?
        AND i.Type = 'read'
        AND i.Timestamp >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(i.Timestamp)
      ORDER BY day ASC
    `;

    const activityResult = await executeQuery({
      query: activityQuery,
      values: [user.id],
    });

    // Create a complete 7-day array, filling in zeros for days with no reads
    const activity = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const formattedDate = date.toISOString().slice(0, 10); // YYYY-MM-DD

      // Check if we have data for this date
      const found =
        Array.isArray(activityResult) &&
        activityResult.find((item) => {
          // Handle different date formats by comparing year, month, day
          const itemDate = new Date(item.day);
          return (
            itemDate.getFullYear() === date.getFullYear() &&
            itemDate.getMonth() === date.getMonth() &&
            itemDate.getDate() === date.getDate()
          );
        });

      activity.push({
        day: formattedDate,
        count: found ? parseInt(found.count, 10) : 0,
      });
    }

    return NextResponse.json({
      success: true,
      activity,
    });
  } catch (error) {
    console.error("Reading activity stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
