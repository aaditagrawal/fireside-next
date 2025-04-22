import { executeQuery } from "./db";

/**
 * Create all stored procedures used by the application
 */
export async function createStoredProcedures() {
  try {
    console.log("Creating stored procedures...");

    // First drop existing procedure if it exists
    await executeQuery({
      query: "DROP PROCEDURE IF EXISTS CalculateUserEngagement",
    });

    // Create the CalculateUserEngagement procedure
    await executeQuery({
      query: `
        CREATE PROCEDURE CalculateUserEngagement(IN user_id INT)
        BEGIN
            DECLARE total_reads INT DEFAULT 0;
            DECLARE total_saves INT DEFAULT 0;
            DECLARE favorite_category VARCHAR(255);
            DECLARE avg_daily_reads DECIMAL(10,2);

            -- Reads
            SELECT COUNT(*) INTO total_reads
            FROM Interactions
            WHERE UserID = user_id AND Type = 'read';

            -- Saves
            SELECT COUNT(*) INTO total_saves
            FROM Interactions
            WHERE UserID = user_id AND Type = 'save';

            -- Category
            SELECT c.Name INTO favorite_category
            FROM Interactions i
            JOIN FeedItems fi ON i.ItemID = fi.ItemID
            JOIN Feeds f ON fi.FeedID = f.FeedID
            JOIN Feed_Categories fc ON f.FeedID = fc.FeedID
            JOIN Categories c ON fc.CategoryID = c.CategoryID
            WHERE i.UserID = user_id
            GROUP BY c.Name
            ORDER BY COUNT(*) DESC
            LIMIT 1;

            -- Avg Daily Reads
            SELECT COALESCE(COUNT(*) / 30, 0) INTO avg_daily_reads
            FROM Interactions
            WHERE UserID = user_id
            AND Type = 'read'
            AND Timestamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);

            -- Return function (to display data)
            SELECT
                total_reads AS TotalReads,
                total_saves AS TotalSaves,
                favorite_category AS FavoriteCategory,
                avg_daily_reads AS AvgDailyReads,

                -- Calculate engagement level using procedural logic
                CASE
                    WHEN total_reads > 100 AND total_saves > 20 THEN 'Power User'
                    WHEN total_reads > 50 OR total_saves > 10 THEN 'Active User'
                    WHEN total_reads > 0 THEN 'Casual Reader'
                    ELSE 'New User'
                END AS EngagementLevel,

                -- Calculate engagement score (numeric)
                (total_reads * 1) + (total_saves * 5) + (avg_daily_reads * 10) AS EngagementScore;
        END
      `,
    });

    console.log("✅ Stored procedures created successfully");

    return { success: true, message: "Stored procedures created successfully" };
  } catch (error) {
    console.error("Error creating stored procedures:", error);
    return {
      success: false,
      message: `Failed to create stored procedures: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Run this function if needed during startup
if (require.main === module) {
  createStoredProcedures()
    .then((result) => {
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error("Error:", err);
      process.exit(1);
    });
}
