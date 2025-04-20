import { executeQuery } from "./db";

async function fixDatabaseSchema() {
  console.log("Running database schema fixes...");

  try {
    // Check if FeedItemCategories table exists (it shouldn't according to your schema)
    const checkTable = await executeQuery({
      query: `
        SELECT COUNT(*) AS table_exists
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'FeedItemCategories'
      `,
      values: [],
    });

    const tableExists =
      Array.isArray(checkTable) &&
      checkTable.length > 0 &&
      checkTable[0].table_exists > 0;

    if (tableExists) {
      console.log(
        "FeedItemCategories table exists but should not according to schema. Creating Feed_Categories if needed.",
      );

      // Check if Feed_Categories exists
      const checkFeedCategories = await executeQuery({
        query: `
          SELECT COUNT(*) AS table_exists
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
          AND table_name = 'Feed_Categories'
        `,
        values: [],
      });

      const feedCategoriesExists =
        Array.isArray(checkFeedCategories) &&
        checkFeedCategories.length > 0 &&
        checkFeedCategories[0].table_exists > 0;

      if (!feedCategoriesExists) {
        // Create the Feed_Categories table
        await executeQuery({
          query: `
            CREATE TABLE Feed_Categories (
              FeedID INT UNSIGNED NOT NULL,
              CategoryID INT UNSIGNED NOT NULL,
              PRIMARY KEY (FeedID, CategoryID),
              FOREIGN KEY (FeedID) REFERENCES Feeds(FeedID) ON DELETE CASCADE ON UPDATE CASCADE,
              FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
          `,
          values: [],
        });
        console.log("Created Feed_Categories table");
      }

      // Migrate data from FeedItemCategories if needed
      try {
        // First check if the FeedItemCategories has any data
        const checkData = await executeQuery({
          query: "SELECT COUNT(*) AS count FROM FeedItemCategories",
          values: [],
        });

        if (
          Array.isArray(checkData) &&
          checkData.length > 0 &&
          checkData[0].count > 0
        ) {
          console.log(
            `Found ${checkData[0].count} rows in FeedItemCategories, migrating to Feed_Categories`,
          );

          // Migrate the data - we'll just associate the feed with the category
          await executeQuery({
            query: `
              INSERT IGNORE INTO Feed_Categories (FeedID, CategoryID)
              SELECT DISTINCT fi.FeedID, fic.CategoryID
              FROM FeedItemCategories fic
              JOIN FeedItems fi ON fic.ItemID = fi.ItemID
            `,
            values: [],
          });
          console.log("Data migration completed");
        }
      } catch (migrationError) {
        console.error("Error during migration:", migrationError);
      }
    } else {
      console.log("FeedItemCategories table doesn't exist, which is expected.");

      // Make sure Feed_Categories exists
      const checkFeedCategories = await executeQuery({
        query: `
          SELECT COUNT(*) AS table_exists
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
          AND table_name = 'Feed_Categories'
        `,
        values: [],
      });

      const feedCategoriesExists =
        Array.isArray(checkFeedCategories) &&
        checkFeedCategories.length > 0 &&
        checkFeedCategories[0].table_exists > 0;

      if (!feedCategoriesExists) {
        console.log("Feed_Categories doesn't exist, creating it now");
        await executeQuery({
          query: `
            CREATE TABLE Feed_Categories (
              FeedID INT UNSIGNED NOT NULL,
              CategoryID INT UNSIGNED NOT NULL,
              PRIMARY KEY (FeedID, CategoryID),
              FOREIGN KEY (FeedID) REFERENCES Feeds(FeedID) ON DELETE CASCADE ON UPDATE CASCADE,
              FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
          `,
          values: [],
        });
        console.log("Created Feed_Categories table");
      } else {
        console.log("Feed_Categories table already exists");
      }
    }

    console.log("Database schema check and fixes completed successfully");
    return {
      success: true,
      message: "Database schema fixes applied successfully",
    };
  } catch (error) {
    console.error("Error fixing database schema:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

if (require.main === module) {
  fixDatabaseSchema()
    .then((result) => {
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error("Script error:", err);
      process.exit(1);
    });
}

export { fixDatabaseSchema };
