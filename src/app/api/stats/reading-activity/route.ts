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

    // Get params
    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("userId");
    const timeRange = searchParams.get("timeRange") || "30d";

    if (!userIdParam || parseInt(userIdParam) !== user.id) {
      return NextResponse.json(
        { success: false, error: "Invalid user ID" },
        { status: 400 },
      );
    }

    // Determine interval based on time range
    let interval: string;
    let groupFormat: string;

    if (timeRange === "7d") {
      interval = "INTERVAL 7 DAY";
      groupFormat = "%Y-%m-%d"; // Daily
    } else if (timeRange === "30d") {
      interval = "INTERVAL 30 DAY";
      groupFormat = "%Y-%m-%d"; // Daily
    } else {
      // Default to 90d
      interval = "INTERVAL 90 DAY";
      groupFormat = "%Y-%m-%d"; // Daily, could change to weekly for longer ranges
    }

    // SQL query to get reading and saving activity by day
    const query = `
      SELECT
        DATE_FORMAT(activity_date, '${groupFormat}') as date,
        SUM(read_count) as readCount,
        SUM(saved_count) as savedCount
      FROM (
        -- Reading activity
        SELECT
          DATE(i.Timestamp) as activity_date,
          COUNT(DISTINCT i.ItemID) as read_count,
          0 as saved_count
        FROM Interactions i
        WHERE i.UserID = ?
          AND i.Type = 'read'
          AND i.Timestamp >= DATE_SUB(CURDATE(), ${interval})
        GROUP BY DATE(i.Timestamp)

        UNION ALL

        -- Saving activity
        SELECT
          DATE(i.Timestamp) as activity_date,
          0 as read_count,
          COUNT(DISTINCT i.ItemID) as saved_count
        FROM Interactions i
        WHERE i.UserID = ?
          AND i.Type = 'save'
          AND i.Timestamp >= DATE_SUB(CURDATE(), ${interval})
        GROUP BY DATE(i.Timestamp)
      ) AS combined
      GROUP BY date
      ORDER BY date ASC
    `;

    const activityData = await executeQuery({
      query: query,
      values: [user.id, user.id],
    });

    // Generate a complete date range for the selected period with valid date strings
    const activity = [];
    const now = new Date();
    const daysToSubtract =
      timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

    for (let i = daysToSubtract - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Format the date as YYYY-MM-DD with proper validation to ensure it's a valid date
      // This fixes the "Error: date value is not finite in DateTimeFormat.format()" issue
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      // Find if we have data for this date
      const found =
        Array.isArray(activityData) &&
        activityData.find((item) => item.date === formattedDate);

      activity.push({
        date: formattedDate,
        readCount: found ? parseInt(found.readCount, 10) : 0,
        savedCount: found ? parseInt(found.savedCount, 10) : 0,
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
