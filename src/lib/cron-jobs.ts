import cron from "node-cron";
import { refreshAllFeeds, generateRecommendations } from "./feed-processor";
import { executeQuery } from "./db";

/**
 * Initialize cron jobs for the RSS aggregator
 */
export function initCronJobs() {
  // Refresh all feeds every 10 seconds
  cron.schedule("*/10 * * * * *", async () => {
    console.log("Running scheduled feed refresh...");
    const result = await refreshAllFeeds();
    console.log(result.message);
  });

  // Generate recommendations for all users daily
  cron.schedule("0 3 * * *", async () => {
    console.log("Generating recommendations for all users...");
    try {
      const users = await executeQuery({
        query: "SELECT UserID FROM Users",
      });

      if (Array.isArray(users) && users.length > 0) {
        for (const user of users) {
          await generateRecommendations(user.UserID);
        }
      }

      console.log(`Generated recommendations for ${users.length} users`);
    } catch (error) {
      console.error("Failed to generate recommendations:", error);
    }
  });

  // Clean up old feed items weekly (items older than 30 days that aren't saved by any user)
  cron.schedule("0 2 * * 0", async () => {
    console.log("Cleaning up old feed items...");
    try {
      const result = await executeQuery({
        query: `
          DELETE fi FROM FeedItems fi
          LEFT JOIN User_FeedItems ufi ON fi.ItemID = ufi.ItemID AND ufi.IsSaved = 1
          WHERE fi.PubDate < DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND ufi.ItemID IS NULL
        `,
      });

      console.log(`Cleaned up old feed items`);
    } catch (error) {
      console.error("Failed to clean up old items:", error);
    }
  });

  console.log("Cron jobs initialized");
}
