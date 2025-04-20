import "dotenv/config";
import cron from "node-cron";
import pool, { executeQuery } from "../src/lib/db";
import { processFeed } from "../src/lib/rss-parser";

// Scheduled job: refresh all feeds at regular intervals
async function refreshAllFeeds() {
  console.log("🔄 Scheduled feed refresh start:", new Date().toISOString());
  try {
    const feeds: any[] = await executeQuery({
      query: "SELECT FeedID, FeedURL FROM Feeds",
      values: [],
    });
    for (const f of feeds) {
      console.log(`→ Refreshing FeedID=${f.FeedID} URL=${f.FeedURL}`);
      try {
        await processFeed(f.FeedURL);
      } catch (err) {
        console.error(`Error processing feed ${f.FeedID}:`, err);
      }
    }
    console.log("✅ Feed refresh complete");
  } catch (err) {
    console.error("Feed refresh job failed:", err);
  }
}

// Schedule: run in every 10 seconds
cron.schedule("*/10 * * * * *", () => {
  refreshAllFeeds();
});

console.log("Cron job scheduled: feeds will refresh in every 10 seconds.");
