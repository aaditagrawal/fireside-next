import { initCronJobs } from "./cron-jobs";
import { executeQuery } from "./db";

/**
 * Initialize the RSS aggregator system
 */
export async function initializeSystem() {
  console.log("Initializing RSS aggregator system...");

  try {
    // 1. Check database connection
    const dbTest = await executeQuery({
      query: "SELECT 'Connected' AS status",
    });

    if (
      !Array.isArray(dbTest) ||
      dbTest.length === 0 ||
      dbTest[0].status !== "Connected"
    ) {
      throw new Error("Database connection failed");
    }

    console.log("✅ Database connection verified");

    // 2. Start cron jobs
    initCronJobs();
    console.log("✅ Cron jobs initialized");

    // 3. Verify required tables exist
    const tables = await executeQuery({
      query: "SHOW TABLES",
    });

    const tableList = Array.isArray(tables)
      ? tables.map((t) => Object.values(t)[0])
      : [];

    const requiredTables = [
      "Users",
      "Feeds",
      "FeedItems",
      "Subscriptions",
      "Authors",
      "Publishers",
      "Categories",
    ];

    const missingTables = requiredTables.filter((t) => !tableList.includes(t));

    if (missingTables.length > 0) {
      throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
    }

    console.log("✅ Required database tables verified");

    // 4. Check for admin user
    const adminUsers = await executeQuery({
      query: "SELECT UserID FROM Users WHERE Role = 'admin' LIMIT 1",
    });

    if (!Array.isArray(adminUsers) || adminUsers.length === 0) {
      console.log("⚠️ No admin user found. Please create one.");
    } else {
      console.log("✅ Admin user verified");
    }

    console.log("RSS aggregator system initialization complete");
    return { success: true, message: "System initialized successfully" };
  } catch (error: unknown) {
    console.error("System initialization failed:", error);
    return {
      success: false,
      message: `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Run the initialization if executed directly
if (require.main === module) {
  initializeSystem()
    .then((result) => {
      console.log(result.message);
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Initialization script error:", err);
      process.exit(1);
    });
}
