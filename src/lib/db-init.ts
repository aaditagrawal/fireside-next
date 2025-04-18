import mariadb from "mariadb";
import dotenv from "dotenv"; // Optional: if you use a .env file

// Optional: Load environment variables from .env file
dotenv.config();

// Define error interfaces for proper typing
interface DatabaseError extends Error {
  code?: string;
  message: string;
}

interface TableRecord {
  [key: string]: string;
}

// --- Database Configuration ---
const dbConfig = {
  host: process.env.MYSQL_HOST || "127.0.0.1", // Often '127.0.0.1' is more reliable than 'localhost' for TCP/IP
  port: parseInt(process.env.MYSQL_PORT || "3306"),
  user: process.env.MYSQL_USER || "appuser", // Ensure this user has CREATE/DROP privileges for setup
  password: process.env.MYSQL_PASSWORD || "secure_password",
  database: process.env.MYSQL_DATABASE || "test", // The database to initialize tables in
  connectionLimit: 5,
  // Allow multiple statements for potentially running larger script blocks later,
  // but be cautious if ever incorporating user input (not the case here).
  multipleStatements: true,
};

// --- SQL Statements ---
// Split into arrays for better control and logging

const dropStatements: string[] = [
  `DROP TABLE IF EXISTS FeedItemAuthors`,
  `DROP TABLE IF EXISTS FeedItemPublishers`,
  `DROP TABLE IF EXISTS Recommendations`,
  `DROP TABLE IF EXISTS Notes`,
  `DROP TABLE IF EXISTS Interactions`,
  `DROP TABLE IF EXISTS Subscriptions`,
  `DROP TABLE IF EXISTS FeedItems`,
  `DROP TABLE IF EXISTS Categories`,
  `DROP TABLE IF EXISTS Publishers`,
  `DROP TABLE IF EXISTS Authors`,
  `DROP TABLE IF EXISTS Feeds`,
  `DROP TABLE IF EXISTS Users`,
  `DROP TABLE IF EXISTS UserSessions`,
];

const createStatements: string[] = [
  // Users
  `CREATE TABLE Users (
      UserID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      Name VARCHAR(255) NOT NULL,
      Email VARCHAR(255) NOT NULL UNIQUE,
      PasswordHash VARCHAR(255) NOT NULL,
      Role VARCHAR(50) DEFAULT 'user',
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      LastLogin DATETIME NULL
  ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // Feeds
  `CREATE TABLE Feeds (
      FeedID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      FeedURL VARCHAR(2048) NOT NULL UNIQUE,
      Title VARCHAR(512),
      Description TEXT,
      LastFetchedAt DATETIME NULL
  ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // Authors
  `CREATE TABLE Authors (
      AuthorID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      Name VARCHAR(255) NOT NULL,
      Email VARCHAR(255) NULL UNIQUE,
      Bio TEXT NULL,
      SocialLinks TEXT NULL
  ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `ALTER TABLE Authors ADD INDEX idx_author_name (Name)`,

  // Publishers
  `CREATE TABLE Publishers (
      PublisherID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      Name VARCHAR(255) NOT NULL,
      Website VARCHAR(2048) NULL,
      LogoURL VARCHAR(2048) NULL,
      RSSMetadata TEXT NULL
  ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `ALTER TABLE Publishers ADD INDEX idx_publisher_name (Name)`,

  // Categories
  `CREATE TABLE Categories (
      CategoryID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      Name VARCHAR(255) NOT NULL UNIQUE,
      Description TEXT NULL,
      ParentCategoryID INT UNSIGNED NULL,
      FOREIGN KEY (ParentCategoryID) REFERENCES Categories(CategoryID) ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // FeedItems
  `CREATE TABLE FeedItems (
      ItemID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      FeedID INT UNSIGNED NOT NULL,
      Title VARCHAR(1024) NOT NULL,
      Content MEDIUMTEXT,
      PubDate DATETIME NULL,
      GUID VARCHAR(512) NOT NULL,
      IsRead BOOLEAN DEFAULT FALSE, -- Flagged for review in multi-user context
      Link VARCHAR(2048) NULL,
      FetchedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (FeedID) REFERENCES Feeds(FeedID) ON DELETE CASCADE ON UPDATE CASCADE,
      UNIQUE KEY unique_guid_per_feed (FeedID, GUID(191))
  ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `ALTER TABLE FeedItems ADD INDEX idx_feeditems_pubdate (PubDate)`,
  `ALTER TABLE FeedItems ADD INDEX idx_feeditems_fetchedat (FetchedAt)`,

  // Subscriptions
  `CREATE TABLE Subscriptions (
      SubscriptionID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      UserID INT UNSIGNED NOT NULL,
      FeedID INT UNSIGNED NOT NULL,
      SubscriptionDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (FeedID) REFERENCES Feeds(FeedID) ON DELETE CASCADE ON UPDATE CASCADE,
      UNIQUE KEY unique_user_feed_subscription (UserID, FeedID)
  ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE UserSessions (
    SessionID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserID INT UNSIGNED NOT NULL,
    SessionToken VARCHAR(255) NOT NULL UNIQUE,
    ExpiresAt DATETIME NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
  ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // Interactions
  `CREATE TABLE Interactions (
      InteractionID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      UserID INT UNSIGNED NOT NULL,
      ItemID INT UNSIGNED NOT NULL,
      Type ENUM('like', 'share', 'note', 'read', 'save', 'hide') NOT NULL,
      Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (ItemID) REFERENCES FeedItems(ItemID) ON DELETE CASCADE ON UPDATE CASCADE,
      INDEX idx_interactions_user_item (UserID, ItemID)
  ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // Notes
  `CREATE TABLE Notes (
      NoteID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      UserID INT UNSIGNED NOT NULL,
      ItemID INT UNSIGNED NOT NULL,
      Content TEXT NOT NULL,
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (ItemID) REFERENCES FeedItems(ItemID) ON DELETE CASCADE ON UPDATE CASCADE,
      INDEX idx_notes_user_item (UserID, ItemID)
  ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // Recommendations
  `CREATE TABLE Recommendations (
      RecommendationID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      UserID INT UNSIGNED NOT NULL,
      ItemID INT UNSIGNED NULL,
      CategoryID INT UNSIGNED NULL,
      FeedID INT UNSIGNED NULL,
      AuthorID INT UNSIGNED NULL,
      PublisherID INT UNSIGNED NULL,
      FrecencyScore DECIMAL(10, 5) NOT NULL,
      LastEngaged DATETIME NULL,
      GeneratedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      RecommendationType VARCHAR(50) NOT NULL,
      FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (ItemID) REFERENCES FeedItems(ItemID) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (FeedID) REFERENCES Feeds(FeedID) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (AuthorID) REFERENCES Authors(AuthorID) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (PublisherID) REFERENCES Publishers(PublisherID) ON DELETE CASCADE ON UPDATE CASCADE,
      INDEX idx_recommendations_user_score (UserID, FrecencyScore DESC)
  ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // FeedItemAuthors
  `CREATE TABLE FeedItemAuthors (
      ItemID INT UNSIGNED NOT NULL,
      AuthorID INT UNSIGNED NOT NULL,
      PRIMARY KEY (ItemID, AuthorID),
      FOREIGN KEY (ItemID) REFERENCES FeedItems(ItemID) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (AuthorID) REFERENCES Authors(AuthorID) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  // FeedItemPublishers
  `CREATE TABLE FeedItemPublishers (
      ItemID INT UNSIGNED NOT NULL,
      PublisherID INT UNSIGNED NOT NULL,
      PRIMARY KEY (ItemID, PublisherID),
      FOREIGN KEY (ItemID) REFERENCES FeedItems(ItemID) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (PublisherID) REFERENCES Publishers(PublisherID) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];

// --- Initialization Function ---
async function initializeDatabase() {
  // Create a separate pool for setup, potentially with higher privileges if needed
  // For now, using the same config as the app. Ensure 'appuser' has sufficient rights.
  const pool = mariadb.createPool(dbConfig);
  let connection: mariadb.PoolConnection | undefined;

  console.log(
    `Attempting to initialize database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`,
  );

  try {
    connection = await pool.getConnection();
    console.log(`Connected to MariaDB database: ${dbConfig.database}`);

    // Drop existing tables (optional, but good for clean slate)
    console.log("Dropping existing tables (if they exist)...");
    for (const statement of dropStatements) {
      // Extract table name for logging
      const tableName = statement.split(" ")[4]; // Basic parsing
      try {
        await connection.query(statement);
        // console.log(` -> Dropped table ${tableName}`); // Verbose logging
      } catch (err: DatabaseError) {
        // Ignore "Unknown table" error, log others
        if (err.code !== "ER_BAD_TABLE_ERROR") {
          console.error(`Error dropping table ${tableName}:`, err.message);
          throw err; // Re-throw significant errors
        } else {
          // console.log(` -> Table ${tableName} did not exist.`); // Verbose logging
        }
      }
    }
    console.log("Finished dropping tables.");

    // Create new tables
    console.log("Creating new tables...");
    for (const statement of createStatements) {
      // Extract table name or type for logging
      let logName = "statement";
      if (statement.toUpperCase().startsWith("CREATE TABLE")) {
        logName = `table ${statement.split(" ")[2].replace(/`/g, "")}`; // Basic parsing
      } else if (statement.toUpperCase().startsWith("ALTER TABLE")) {
        logName = `alteration on ${statement.split(" ")[2].replace(/`/g, "")}`; // Basic parsing
      }

      try {
        await connection.query(statement);
        console.log(` -> Executed creation: ${logName}`);
      } catch (err: DatabaseError) {
        console.error(
          `Error executing: ${logName}\nSQL: ${statement.substring(0, 100)}...\nError:`,
          err.message,
        );
        throw err; // Stop initialization on error
      }
    }
    console.log("Finished creating tables.");

    // Verify by showing tables
    console.log("Verifying created tables...");
    const tables = await connection.query("SHOW TABLES");
    console.log("Tables in database:");
    console.table(
      tables.map((t: TableRecord) => ({
        Table: t[`Tables_in_${dbConfig.database}`],
      })),
    );

    console.log(
      "\n✅ Fireside RSS Aggregator database initialization successful!",
    );
  } catch (error: DatabaseError) {
    console.error("\n❌ Database initialization failed:");
    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error(
        " -> Access denied. Check user credentials and permissions.",
      );
      console.error(
        ` -> User: ${dbConfig.user}, Database: ${dbConfig.database}`,
      );
    } else if (error.code === "ER_DBACCESS_DENIED_ERROR") {
      console.error(
        ` -> User ${dbConfig.user} does not have access to database ${dbConfig.database}.`,
      );
    } else if (error.code === "ER_BAD_DB_ERROR") {
      console.error(
        ` -> Database ${dbConfig.database} does not exist. Please create it first.`,
      );
      console.error(` -> Run: CREATE DATABASE ${dbConfig.database};`);
    } else if (error.code === "ECONNREFUSED") {
      console.error(
        ` -> Connection refused. Is the MariaDB server running at ${dbConfig.host}:${dbConfig.port}?`,
      );
    } else {
      console.error(" -> Error details:", error.message);
    }
    // Exit with error code if initialization fails
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.release();
        console.log("Database connection released.");
      } catch (releaseError) {
        console.error("Error releasing connection:", releaseError);
      }
    }
    try {
      await pool.end();
      console.log("Connection pool closed.");
    } catch (poolError) {
      console.error("Error closing pool:", poolError);
    }
  }
}

// --- Run the initialization ---
initializeDatabase();
