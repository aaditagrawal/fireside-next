import { executeQuery } from "./db";
import { fetchFeed } from "./rss-parser";

/**
 * Comprehensive feed processor that populates all database tables
 */
export async function comprehensiveFeedProcessor(
  feedUrl: string,
  userId?: number,
) {
  console.log(`Starting comprehensive processing for feed: ${feedUrl}`);

  try {
    // 1. Fetch and parse the feed
    const feed = await fetchFeed(feedUrl);
    if (!feed || !feed.items) {
      return {
        success: false,
        message:
          "Failed to fetch or parse feed. URL may be invalid or format unrecognized.",
      };
    }

    // 2. Process feed/publisher information
    let feedId: number;
    const existingFeeds = await executeQuery({
      query: "SELECT FeedID, Title FROM Feeds WHERE FeedURL = ?",
      values: [feedUrl],
    });

    // Publisher handling
    let publisherId: number | null = null;
    if (feed.publisher?.name) {
      // Check if publisher exists
      const publisherResult = await executeQuery({
        query: "SELECT PublisherID FROM Publishers WHERE Name = ?",
        values: [feed.publisher.name],
      });

      if (Array.isArray(publisherResult) && publisherResult.length > 0) {
        publisherId = publisherResult[0].PublisherID;
      } else {
        // Create new publisher - fix for the parameter count issue
        const publisherUrl =
          typeof feed.publisher.url === "string"
            ? feed.publisher.url
            : typeof feed.link === "string"
              ? feed.link
              : "";

        const logoUrl =
          typeof feed.publisher.logo === "string" ? feed.publisher.logo : null;

        const newPublisher = await executeQuery({
          query:
            "INSERT INTO Publishers (Name, Website, LogoURL) VALUES (?, ?, ?)",
          values: [feed.publisher.name, publisherUrl, logoUrl],
        });

        if (
          newPublisher &&
          typeof newPublisher === "object" &&
          "insertId" in newPublisher
        ) {
          publisherId = newPublisher.insertId;
        }
      }
    }

    // Feed insertion or update
    if (!Array.isArray(existingFeeds) || existingFeeds.length === 0) {
      // Create new feed
      const feedResult = await executeQuery({
        query:
          "INSERT INTO Feeds (FeedURL, Title, Description, LastFetchedAt, PublisherID) VALUES (?, ?, ?, NOW(), ?)",
        values: [
          feedUrl,
          feed.title || "Untitled Feed",
          feed.description || "",
          publisherId,
        ],
      });

      if (
        !feedResult ||
        typeof feedResult !== "object" ||
        !("insertId" in feedResult)
      ) {
        return {
          success: false,
          message: "Failed to save feed to database",
        };
      }

      feedId = feedResult.insertId;
      console.log(`New feed added with ID ${feedId}`);
    } else {
      feedId = existingFeeds[0].FeedID;

      // Update existing feed
      await executeQuery({
        query:
          "UPDATE Feeds SET Title = ?, Description = ?, LastFetchedAt = NOW(), PublisherID = ? WHERE FeedID = ?",
        values: [
          feed.title || existingFeeds[0].Title || "Untitled Feed",
          feed.description || "",
          publisherId,
          feedId,
        ],
      });

      console.log(`Updated existing feed with ID ${feedId}`);
    }

    // 3. Handle feed categories
    if (feed.categories && feed.categories.length > 0) {
      for (const categoryName of feed.categories) {
        if (!categoryName.trim()) continue;

        // Get or create category
        let categoryId: number;
        const existingCategory = await executeQuery({
          query: "SELECT CategoryID FROM Categories WHERE Name = ?",
          values: [categoryName],
        });

        if (Array.isArray(existingCategory) && existingCategory.length > 0) {
          categoryId = existingCategory[0].CategoryID;
        } else {
          const newCategory = await executeQuery({
            query: "INSERT INTO Categories (Name) VALUES (?)",
            values: [categoryName],
          });

          if (
            !newCategory ||
            typeof newCategory !== "object" ||
            !("insertId" in newCategory)
          ) {
            console.log(`Failed to create category: ${categoryName}`);
            continue;
          }

          categoryId = newCategory.insertId;
        }

        // Associate feed with category
        await executeQuery({
          query:
            "INSERT IGNORE INTO Feed_Categories (FeedID, CategoryID) VALUES (?, ?)",
          values: [feedId, categoryId],
        });
      }
    }

    // 4. Subscribe user if userId is provided
    if (userId) {
      await executeQuery({
        query:
          "INSERT IGNORE INTO Subscriptions (UserID, FeedID) VALUES (?, ?)",
        values: [userId, feedId],
      });
      console.log(`User ${userId} subscribed to feed ${feedId}`);
    }

    // 5. Process feed items
    let newItemCount = 0;
    let updatedItemCount = 0;

    for (const item of feed.items) {
      const guid = item.guid || item.link;
      if (!guid) {
        console.log(
          `Skipping item without guid or link: ${item.title || "(no title)"}`,
        );
        continue;
      }

      try {
        // Check if item exists
        const existingItems = await executeQuery({
          query:
            "SELECT ItemID, Content FROM FeedItems WHERE FeedID = ? AND GUID = ?",
          values: [feedId, guid],
        });

        let itemId: number;
        let isNewItem = false;

        // Parse publication date
        let pubDate: string | null = null;
        if (item.pubDate) {
          try {
            const date = new Date(item.pubDate);
            if (!isNaN(date.getTime())) {
              pubDate = date.toISOString().slice(0, 19).replace("T", " ");
            }
          } catch (e) {
            console.log(
              `Invalid date format for item: ${item.title || "(no title)"}`,
            );
          }
        }

        if (!Array.isArray(existingItems) || existingItems.length === 0) {
          // Create new item
          const itemResult = await executeQuery({
            query: `
              INSERT INTO FeedItems (FeedID, Title, Content, PubDate, GUID, Link)
              VALUES (?, ?, ?, ?, ?, ?)
            `,
            values: [
              feedId,
              item.title || "Untitled Item",
              item.content || item.contentSnippet || "",
              pubDate,
              guid,
              item.link || "",
            ],
          });

          if (
            !itemResult ||
            typeof itemResult !== "object" ||
            !("insertId" in itemResult)
          ) {
            console.log(`Failed to save item: ${item.title || "(no title)"}`);
            continue;
          }

          itemId = itemResult.insertId;
          isNewItem = true;
          newItemCount++;
        } else {
          itemId = existingItems[0].ItemID;

          // Update content if it's more substantial
          const currentContent = existingItems[0].Content || "";
          const newContent = item.content || item.contentSnippet || "";

          if (newContent.length > currentContent.length) {
            await executeQuery({
              query:
                "UPDATE FeedItems SET Content = ?, Title = ? WHERE ItemID = ?",
              values: [newContent, item.title || "Untitled Item", itemId],
            });
            updatedItemCount++;
          }
        }

        // 6. Process authors for this item
        if (item.authors?.length > 0 || item.author) {
          const authorNames =
            item.authors || (item.author ? [item.author] : []);

          for (const authorName of authorNames) {
            if (!authorName.trim()) continue;

            // Get or create author
            let authorId: number;
            const existingAuthor = await executeQuery({
              query: "SELECT AuthorID FROM Authors WHERE Name = ?",
              values: [authorName],
            });

            if (Array.isArray(existingAuthor) && existingAuthor.length > 0) {
              authorId = existingAuthor[0].AuthorID;
            } else {
              const newAuthor = await executeQuery({
                query: "INSERT INTO Authors (Name) VALUES (?)",
                values: [authorName],
              });

              if (
                !newAuthor ||
                typeof newAuthor !== "object" ||
                !("insertId" in newAuthor)
              ) {
                console.log(`Failed to create author: ${authorName}`);
                continue;
              }

              authorId = newAuthor.insertId;
            }

            // Associate item with author
            await executeQuery({
              query:
                "INSERT IGNORE INTO FeedItemAuthors (ItemID, AuthorID) VALUES (?, ?)",
              values: [itemId, authorId],
            });
          }
        }

        // 7. Process item categories
        if (item.categories && item.categories.length > 0) {
          const normalizedCategories = (item.categories as any[])
            .map(raw => typeof raw === 'string'
              ? raw
              : raw && typeof raw === 'object' && 'content' in raw
                ? (raw as any).content
                : String(raw))
            .map(s => s.trim())
            .filter(Boolean);
          for (const name of normalizedCategories) {

            // Get or create category
            let categoryId: number;
            const existingCategory = await executeQuery({
              query: "SELECT CategoryID FROM Categories WHERE Name = ?",
              values: [name],
            });

            if (
              Array.isArray(existingCategory) &&
              existingCategory.length > 0
            ) {
              categoryId = existingCategory[0].CategoryID;
            } else {
              const newCategory = await executeQuery({
                query: "INSERT INTO Categories (Name) VALUES (?)",
                values: [name],
              });

              if (
                !newCategory ||
                typeof newCategory !== "object" ||
                !("insertId" in newCategory)
              ) {
                console.log(`Failed to create category: ${name}`);
                continue;
              }

              categoryId = newCategory.insertId;
            }

            // Associate feed with category
            await executeQuery({
              query:
                "INSERT IGNORE INTO Feed_Categories (FeedID, CategoryID) VALUES (?, ?)",
              values: [feedId, categoryId],
            });
          }
        }

        // 8. Link item to publisher if available
        if (publisherId) {
          await executeQuery({
            query:
              "INSERT IGNORE INTO FeedItemPublishers (ItemID, PublisherID) VALUES (?, ?)",
            values: [itemId, publisherId],
          });
        }

        // 9. For new items, create User_FeedItems entries for all subscribers
        if (isNewItem) {
          // Get all subscribers to this feed
          const subscribers = await executeQuery({
            query: "SELECT UserID FROM Subscriptions WHERE FeedID = ?",
            values: [feedId],
          });

          if (Array.isArray(subscribers) && subscribers.length > 0) {
            for (const subscriber of subscribers) {
              await executeQuery({
                query:
                  "INSERT IGNORE INTO User_FeedItems (UserID, ItemID, IsRead, IsSaved) VALUES (?, ?, 0, 0)",
                values: [subscriber.UserID, itemId],
              });
            }
          }
        }
      } catch (itemError) {
        console.error(`Error processing item with GUID ${guid}:`, itemError);
      }
    }

    return {
      success: true,
      message: `Feed processed successfully. ${newItemCount} new items, ${updatedItemCount} updated items.`,
      feedId,
    };
  } catch (error) {
    console.error(
      `Error in comprehensive feed processing for ${feedUrl}:`,
      error,
    );
    return {
      success: false,
      message: `Processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Refresh all feeds in the database
 */
export async function refreshAllFeeds() {
  try {
    const feeds = await executeQuery({
      query: "SELECT FeedID, FeedURL FROM Feeds",
    });

    if (!Array.isArray(feeds) || feeds.length === 0) {
      return { success: true, message: "No feeds to refresh" };
    }

    const results = {
      total: feeds.length,
      success: 0,
      failed: 0,
      details: [] as Array<{ url: string; status: string }>,
    };

    for (const feed of feeds) {
      try {
        console.log(`Refreshing feed: ${feed.FeedURL}`);
        const result = await comprehensiveFeedProcessor(feed.FeedURL);

        if (result.success) {
          results.success++;
          results.details.push({ url: feed.FeedURL, status: "success" });
        } else {
          results.failed++;
          results.details.push({
            url: feed.FeedURL,
            status: `failed: ${result.message}`,
          });
        }
      } catch (feedError) {
        results.failed++;
        results.details.push({
          url: feed.FeedURL,
          status: `error: ${feedError instanceof Error ? feedError.message : "Unknown error"}`,
        });
      }
    }

    return {
      success: true,
      message: `Processed ${results.total} feeds: ${results.success} succeeded, ${results.failed} failed.`,
      results,
    };
  } catch (error) {
    console.error("Error refreshing all feeds:", error);
    return {
      success: false,
      message: `Failed to refresh feeds: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Generate recommendations for a user based on their reading history
 */
export async function generateRecommendations(userId: number) {
  try {
    // Find categories the user has engaged with
    const userCategories = await executeQuery({
      query: `
        SELECT DISTINCT fc.CategoryID, c.Name as CategoryName, COUNT(ufi.ItemID) as EngagementCount
        FROM User_FeedItems ufi
        JOIN FeedItems fi ON ufi.ItemID = fi.ItemID
        JOIN Feeds f ON fi.FeedID = f.FeedID
        JOIN Feed_Categories fc ON f.FeedID = fc.FeedID
        JOIN Categories c ON fc.CategoryID = c.CategoryID
        WHERE ufi.UserID = ? AND (ufi.IsRead = 1 OR ufi.IsSaved = 1)
        GROUP BY fc.CategoryID, c.Name
        ORDER BY EngagementCount DESC
      `,
      values: [userId],
    });

    if (!Array.isArray(userCategories) || userCategories.length === 0) {
      return {
        success: true,
        message: "No engagement history to generate recommendations",
      };
    }

    // Update or insert recommendations
    for (const category of userCategories) {
      const frecencyScore = Number(category.EngagementCount) * 0.1; // Simple scoring

      // Check if recommendation exists
      const existingRec = await executeQuery({
        query:
          "SELECT RecommendationID FROM Recommendations WHERE UserID = ? AND CategoryID = ?",
        values: [userId, category.CategoryID],
      });

      if (Array.isArray(existingRec) && existingRec.length > 0) {
        // Update existing recommendation
        await executeQuery({
          query:
            "UPDATE Recommendations SET FrecencyScore = ?, LastEngaged = NOW() WHERE RecommendationID = ?",
          values: [frecencyScore, existingRec[0].RecommendationID],
        });
      } else {
        // Create new recommendation
        await executeQuery({
          query:
            "INSERT INTO Recommendations (UserID, CategoryID, FrecencyScore, LastEngaged) VALUES (?, ?, ?, NOW())",
          values: [userId, category.CategoryID, frecencyScore],
        });
      }
    }

    return {
      success: true,
      message: `Generated recommendations for ${userCategories.length} categories`,
    };
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return {
      success: false,
      message: `Failed to generate recommendations: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Mark an item as read for a user
 */
export async function markItemRead(userId: number, itemId: number) {
  try {
    // Update FeedItems.IsRead for compatibility
    await executeQuery({
      query: "UPDATE FeedItems SET IsRead = 1 WHERE ItemID = ?",
      values: [itemId],
    });

    // Update or insert User_FeedItems record
    const existingRecord = await executeQuery({
      query: "SELECT 1 FROM User_FeedItems WHERE UserID = ? AND ItemID = ?",
      values: [userId, itemId],
    });

    if (Array.isArray(existingRecord) && existingRecord.length > 0) {
      await executeQuery({
        query:
          "UPDATE User_FeedItems SET IsRead = 1, LastInteractionAt = NOW() WHERE UserID = ? AND ItemID = ?",
        values: [userId, itemId],
      });
    } else {
      await executeQuery({
        query:
          "INSERT INTO User_FeedItems (UserID, ItemID, IsRead, IsSaved, LastInteractionAt) VALUES (?, ?, 1, 0, NOW())",
        values: [userId, itemId],
      });
    }

    // Record interaction
    await executeQuery({
      query:
        "INSERT INTO Interactions (UserID, ItemID, Type) VALUES (?, ?, 'read')",
      values: [userId, itemId],
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking item as read:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Save a feed item for a user
 */
export async function saveItem(userId: number, itemId: number, note?: string) {
  try {
    // Update or insert User_FeedItems record
    const existingRecord = await executeQuery({
      query: "SELECT 1 FROM User_FeedItems WHERE UserID = ? AND ItemID = ?",
      values: [userId, itemId],
    });

    if (Array.isArray(existingRecord) && existingRecord.length > 0) {
      await executeQuery({
        query:
          "UPDATE User_FeedItems SET IsSaved = 1, LastInteractionAt = NOW() WHERE UserID = ? AND ItemID = ?",
        values: [userId, itemId],
      });
    } else {
      await executeQuery({
        query:
          "INSERT INTO User_FeedItems (UserID, ItemID, IsRead, IsSaved, LastInteractionAt) VALUES (?, ?, 1, 1, NOW())",
        values: [userId, itemId],
      });
    }

    // Record save interaction
    await executeQuery({
      query:
        "INSERT INTO Interactions (UserID, ItemID, Type) VALUES (?, ?, 'save')",
      values: [userId, itemId],
    });

    // Add note if provided
    if (note) {
      await executeQuery({
        query: "INSERT INTO Notes (UserID, ItemID, Content) VALUES (?, ?, ?)",
        values: [userId, itemId, note],
      });

      // Record note interaction
      await executeQuery({
        query:
          "INSERT INTO Interactions (UserID, ItemID, Type) VALUES (?, ?, 'note')",
        values: [userId, itemId],
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving item:", error);
    return { success: false, error: String(error) };
  }
}
