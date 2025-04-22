import { executeQuery } from "./db";
import { comprehensiveFeedProcessor } from "./feed-processor";

const SAMPLE_FEEDS = [
  // Technology
  "https://news.ycombinator.com/rss",
  "https://www.wired.com/feed/rss",
  "https://feeds.arstechnica.com/arstechnica/index",
  "https://techcrunch.com/feed/",
  "https://www.theverge.com/rss/index.xml",
  "https://www.cnet.com/rss/all/",
  "https://rss.slashdot.org/Slashdot/slashdotMain",
  "https://www.technologyreview.com/feed/",
  "https://www.zdnet.com/news/rss.xml",

  // News
  "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://www.theguardian.com/world/rss",
  "https://www.washingtonpost.com/rss/",
  "https://www.economist.com/rss",
  "https://www.reuters.com/rssfeed/topNews",
  "https://feeds.npr.org/1001/rss.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://www.ft.com/rss/home",

  // Science
  "https://www.sciencedaily.com/rss/all.xml",
  "https://www.nature.com/nature.rss",
  "https://www.quantamagazine.org/feed/",
  "https://rss.sciam.com/ScientificAmerican-Global",
  "https://science.nasa.gov/rss.xml",
  "https://phys.org/rss-feed/",
  "https://www.newscientist.com/feed/home/",
  "https://www.popsci.com/feed/",

  // Entertainment
  "https://variety.com/feed/",
  "https://www.rollingstone.com/feed/",
  "https://www.hollywoodreporter.com/feed/",
  "https://deadline.com/feed/",
  "https://www.billboard.com/feed/",
  "https://ew.com/feed/",
  "https://www.avclub.com/rss",
  "https://www.metacritic.com/rss/",

  // Dev blogs
  "https://blog.google/rss/",
  "https://engineering.fb.com/feed/",
  "https://netflixtechblog.com/feed",
  "https://developer.apple.com/news/rss/news.rss",
  "https://aws.amazon.com/blogs/aws/feed/",
  "https://devblogs.microsoft.com/feed/",
  "https://medium.com/feed/@github",
  "https://blog.twitter.com/engineering/en_us/blog.rss",
  "https://eng.uber.com/feed/",
  "https://engineering.linkedin.com/blog.rss",
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

    const categoryIds = {};
    for (const category of baseCategories) {
      const result = await executeQuery({
        query:
          "INSERT IGNORE INTO Categories (Name, Description) VALUES (?, ?)",
        values: [category, `Content related to ${category.toLowerCase()}`],
      });

      // Get category ID
      const catResult = await executeQuery({
        query: "SELECT CategoryID FROM Categories WHERE Name = ?",
        values: [category],
      });

      if (Array.isArray(catResult) && catResult.length > 0) {
        categoryIds[category] = catResult[0].CategoryID;
      }
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

    // Add initial recommendations for the admin user
    if (adminUserId) {
      console.log("Creating initial recommendations for admin user");
      for (const [category, categoryId] of Object.entries(categoryIds)) {
        // Initial frecency scores that gradually decrease
        const baseScore = 10 - Object.keys(categoryIds).indexOf(category) * 0.5;

        await executeQuery({
          query: `
             INSERT INTO Recommendations
               (UserID, CategoryID, FrecencyScore, LastEngaged)
             VALUES (?, ?, ?, NOW())
           `,
          values: [adminUserId, categoryId, baseScore],
        });
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
      message: `Seeded database with ${successCount} feeds and initial recommendations`,
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
