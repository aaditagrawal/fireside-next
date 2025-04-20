import { executeQuery } from "./db";
import { comprehensiveFeedProcessor } from "./feed-processor";

const SAMPLE_FEEDS = [
  // Technology
  "https://news.ycombinator.com/rss",
  "https://www.wired.com/feed/rss",
  "https://feeds.arstechnica.com/arstechnica/index",
  "https://techcrunch.com/feed/",

  // News
  "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://www.theguardian.com/world/rss",

  // Science
  "https://www.sciencedaily.com/rss/all.xml",
  "https://www.nature.com/nature.rss",
  "https://www.quantamagazine.org/feed/",

  // Entertainment
  "https://variety.com/feed/",
  "https://www.rollingstone.com/feed/",

  // Dev blogs
  "https://blog.google/rss/",
  "https://engineering.fb.com/feed/",
  "https://netflixtechblog.com/feed",
  "https://developer.apple.com/news/rss/news.rss",
];

/**
 * Seed the database with sample RSS feeds
 */
export async function seedDatabase(adminUserId: number) {
  console.log("Starting database seeding with sample feeds...");

  try {
    // First, make sure we have categories
    const baseCategories = [
      "Technology",
      "News",
      "Science",
      "Entertainment",
      "Development",
    ];

    for (const category of baseCategories) {
      await executeQuery({
        query:
          "INSERT IGNORE INTO Categories (Name, Description) VALUES (?, ?)",
        values: [category, `Content related to ${category.toLowerCase()}`],
      });
    }

    console.log("Categories created");

    // Process each feed
    let successCount = 0;
    let failureCount = 0;

    for (const feedUrl of SAMPLE_FEEDS) {
      try {
        console.log(`Processing feed: ${feedUrl}`);
        const result = await comprehensiveFeedProcessor(feedUrl, adminUserId);

        if (result.success) {
          successCount++;
          console.log(`✅ Successfully processed: ${feedUrl}`);
        } else {
          failureCount++;
          console.log(`❌ Failed to process: ${feedUrl} - ${result.message}`);
        }
      } catch (error) {
        failureCount++;
        console.error(`Error processing feed ${feedUrl}:`, error);
      }
    }

    console.log(`
    Database seeding complete:
    - Total feeds attempted: ${SAMPLE_FEEDS.length}
    - Successfully processed: ${successCount}
    - Failed: ${failureCount}
    `);

    return {
      success: true,
      message: `Seeded database with ${successCount} feeds`,
    };
  } catch (error) {
    console.error("Database seeding failed:", error);
    return {
      success: false,
      message: `Seeding failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  // Replace with an actual admin user ID or create one
  const ADMIN_USER_ID = 1;

  seedDatabase(ADMIN_USER_ID)
    .then((result) => {
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error("Seeding script error:", err);
      process.exit(1);
    });
}
