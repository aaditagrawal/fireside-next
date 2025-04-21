import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import pool from "@/lib/db";

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

    // Get userId from URL params or use authenticated user's ID
    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("userId");
    const userId = userIdParam ? parseInt(userIdParam, 10) : user.id;

    // Check permissions if requesting data for another user
    if (userId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Permission denied" },
        { status: 403 },
      );
    }

    // Get a connection from the pool
    let connection;
    try {
      connection = await pool.getConnection();

      // Call the stored procedure
      const results = await connection.query(
        "CALL CalculateUserEngagement(?)",
        [userId],
      );

      // The results from a stored procedure come as an array where the first element
      // contains our result set
      const engagementData = results[0]?.[0] || {
        TotalReads: 0,
        TotalSaves: 0,
        FavoriteCategory: null,
        AvgDailyReads: 0,
        EngagementLevel: "New User",
        EngagementScore: 0,
      };

      return NextResponse.json({
        success: true,
        engagement: engagementData,
      });
    } finally {
      if (connection) connection.release();
    }
  } catch (error) {
    console.error("User engagement stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
