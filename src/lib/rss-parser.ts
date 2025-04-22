import RssParser from "rss-parser"; // Renamed to avoid conflict with xml2js Parser
import { executeQuery } from "./db";
import { Parser as XmlParser, processors } from "xml2js"; // Correct import for xml2js parser
import { comprehensiveFeedProcessor } from "./feed-processor";

// Custom parser types
interface CustomFeed {
  title?: string;
  description?: string;
  link?: string;
  feedUrl?: string;
  items: CustomItem[];
  lastBuildDate?: string;
  pubDate?: string;
  publisher?: {
    name?: string;
    url?: string;
    logo?: string;
  };
  generator?: string;
  categories?: string[];
}

interface CustomItem {
  [key: string]: unknown;
  title?: string;
  content?: string;
  contentSnippet?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  author?: string;
  authors?: string[];
  categories?: string[];
  isoDate?: string;
}

// Create a custom parser instance for rss-parser
const rssParser = new RssParser({
  customFields: {
    feed: ["generator", "publisher", "lastBuildDate", "category"],
    item: [
      "author",
      "content",
      "contentSnippet",
      "creator",
      "encoded",
      "category",
    ],
  },
  xml2js: {
    // Improve namespace handling
    xmlns: true,
    explicitArray: false,
    mergeAttrs: false,
    normalize: true,
    normalizeTags: true,
    // Better handling of CDATA
    trim: true,
    explicitCharkey: true,
  },
});

// Create instance for xml2js parser
const xmlParserInstance = new XmlParser({
  explicitArray: false,
  tagNameProcessors: [processors.stripPrefix], // Helps normalize tags like dc:creator
  attrNameProcessors: [processors.stripPrefix],
});

/**
 * Promisified version of xml2js.parseString
 */
function parseXmlString(xml: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    xmlParserInstance.parseString(xml, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Fetch and parse a feed from the given URL with more robust error handling
 */
export async function fetchFeed(feedUrl: string): Promise<CustomFeed | null> {
  try {
    console.log(`Fetching feed from: ${feedUrl}`);

    // Fetch the raw content first
    const response = await fetch(feedUrl, {
      headers: {
        // Some servers require a user agent
        "User-Agent": "Fireside RSS Reader/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the text content
    const content = await response.text();

    // First try with rss-parser
    try {
      // Better parser configuration for handling various RSS formats
      const parser = new RssParser({
        customFields: {
          feed: ["generator", "publisher", "lastBuildDate", "category"],
          item: [
            "author",
            "content",
            "contentSnippet",
            "creator",
            "encoded",
            "category",
          ],
        },
        xml2js: {
          // More robust XML parsing options
          xmlns: true,
          explicitArray: false,
          mergeAttrs: true,
          normalize: true,
          normalizeTags: true,
          trim: true,
          // Add CDATA handling
          explicitCharkey: true,
        },
      });

      const feed = await parser.parseString(content);
      console.log("Standard parser succeeded");

      // Ensure items is an array and process Dublin Core fields
      if (!feed.items) feed.items = [];
      else if (!Array.isArray(feed.items)) feed.items = [feed.items];

      // Process Dublin Core and namespaced content
      feed.items = feed.items.map((item) => {
        // Handle Dublin Core creator for author
        if (item["dc:creator"] && !item.author) {
          item.author = item["dc:creator"];
        }

        // Handle content:encoded if available (commonly used for full content)
        if (item["content:encoded"] && !item.content) {
          item.content = item["content:encoded"];
        }

        return item;
      });

      // Extract feed-level categories
      let feedCategories: string[] = [];
      if ((feed as any).category) {
        if (Array.isArray((feed as any).category)) {
          feedCategories = (feed as any).category as string[];
        } else {
          feedCategories = [(feed as any).category as string];
        }
      }
      (feed as any).categories = feedCategories.filter(Boolean);

      return feed as unknown as CustomFeed;
    } catch (rssParseError) {
      console.log(
        "Standard parser failed, trying alternative method...",
        rssParseError,
      );
      // If rss-parser fails, try manual XML parsing
      return await parseAlternative(content, feedUrl);
    }
  } catch (fetchError) {
    // Catch errors from fetch or the alternative parser
    console.error(
      `Error fetching or parsing feed from ${feedUrl}:`,
      fetchError,
    );
    return null;
  }
}

/**
 * Alternative parsing method for feeds that don't work with rss-parser
 * Now takes the content directly rather than fetching again
 */
async function parseAlternative(
  xmlContent: string,
  feedUrl: string,
): Promise<CustomFeed | null> {
  try {
    // Configure xml2js parser with more permissive options
    const parser = new XmlParser({
      explicitArray: false,
      normalizeTags: false, // Don't normalize tags to preserve namespaces
      normalize: true,
      trim: true,
      explicitCharkey: true,
      attrkey: "attr",
      charkey: "content",
      // Add CDATA handling
      xmlns: true,
      mergeAttrs: false,
      // Better namespace handling
      attrNameProcessors: [processors.stripPrefix],
      tagNameProcessors: [processors.stripPrefix],
    });

    const result = await parseXmlString(xmlContent);
    console.log(
      "Alternative parser result structure:",
      Object.keys(result).length > 0 ? "Valid structure" : "Empty result",
    );

    // Attempt to normalize different feed formats (RSS, Atom, etc)
    const feed: CustomFeed = { items: [] };

    // RSS 2.0
    if (
      result.rss &&
      typeof result.rss === "object" &&
      "channel" in result.rss
    ) {
      const channel = result.rss.channel as Record<string, unknown>;

      // Handle title which might be in CDATA
      feed.title = extractTextContent(channel.title);
      feed.description = extractTextContent(channel.description);
      feed.link =
        channel.link &&
        typeof channel.link === "object" &&
        "content" in channel.link
          ? (channel.link.content as string)
          : (channel.link as string);
      feed.feedUrl = feedUrl;
      feed.lastBuildDate = (channel.lastbuilddate ||
        channel.lastBuildDate) as string;
      feed.pubDate = (channel.pubdate || channel.pubDate) as string;
      feed.generator = channel.generator as string;

      // Extract publisher info if available
      if (channel.image) {
        feed.publisher = {
          name: extractTextContent(channel.title),
          url:
            channel.link &&
            typeof channel.link === "object" &&
            "content" in channel.link
              ? (channel.link.content as string)
              : (channel.link as string),
          logo:
            channel.image &&
            typeof channel.image === "object" &&
            "url" in channel.image
              ? typeof channel.image.url === "object" &&
                "content" in channel.image.url
                ? (channel.image.url.content as string)
                : (channel.image.url as string)
              : "",
        };
      }

      // Extract feed-level categories
      const fallbackCategories: string[] = [];
      if (channel.category) {
        if (Array.isArray(channel.category)) {
          for (const cat of channel.category as Array<unknown>) {
            const text = extractTextContent(cat);
            if (text) fallbackCategories.push(text);
          }
        } else {
          const text = extractTextContent(channel.category);
          if (text) fallbackCategories.push(text);
        }
      }
      (feed as any).categories = fallbackCategories;

      // Handle items
      const items = Array.isArray(channel.item)
        ? channel.item
        : channel.item
          ? [channel.item]
          : [];

      feed.items = items.map((item: Record<string, unknown>) => {
        // Extract dc:creator for Quanta Magazine style feeds
        if (item["dc:creator"] && !item.author) {
          item.creator = extractTextContent(item["dc:creator"]);
        }

        // Handle content:encoded for full article content
        if (item["content:encoded"] && !item.content) {
          item.content = extractTextContent(item["content:encoded"]);
        }

        return normalizeItem(item);
      });
    }
    // Atom
    else if (result.feed && typeof result.feed === "object") {
      const atomFeed = result.feed as Record<string, unknown>;

      feed.title = extractTextContent(atomFeed.title);
      feed.description = extractTextContent(atomFeed.subtitle);
      feed.link = getAtomLink(atomFeed.link);
      feed.feedUrl = feedUrl;
      feed.pubDate = atomFeed.updated as string;
      feed.generator = atomFeed.generator as string;

      // Extract publisher info
      feed.publisher = {
        name: extractTextContent(atomFeed.title),
        url: getAtomLink(atomFeed.link),
        logo: (atomFeed.logo as string) || (atomFeed.icon as string),
      };

      // Handle entries (Atom's version of items)
      const entries = Array.isArray(atomFeed.entry)
        ? atomFeed.entry
        : atomFeed.entry
          ? [atomFeed.entry]
          : [];

      feed.items = entries.map((entry) =>
        normalizeAtomEntry(entry as Record<string, unknown>),
      );
    } else {
      // If we still can't identify a known format, try one more approach
      // Sometimes the root element contains namespace info that confuses the parser
      for (const rootKey in result) {
        if (rootKey === "feed") {
          console.log("Found Atom feed in unexpected structure");
          // Atom-like structure
          const atomFeed = result[rootKey] as Record<string, unknown>;
          // Similar processing as above...
          feed.title = extractTextContent(atomFeed.title);
          // ...continue with Atom processing
        } else if (rootKey.includes("rss") || rootKey.includes("RDF")) {
          console.log("Found RSS-like feed in unexpected structure");
          // RSS-like structure
          const rootObj = result[rootKey] as Record<string, unknown>;
          const rssChannel = rootObj.channel as Record<string, unknown>;
          if (rssChannel) {
            // Similar processing as above...
            feed.title = extractTextContent(rssChannel.title);
            // ...continue with RSS processing
          }
        }
      }
    }

    // Ensure we have something to return
    if (feed.title || feed.items.length > 0) {
      return feed;
    }

    console.log("Could not extract feed structure from XML");
    return null;
  } catch (error) {
    console.error(`Alternative parsing failed for ${feedUrl}:`, error);
    return null;
  }
}

/**
 * Helper function to extract text content from various formats
 * Handles CDATA and complex objects
 */
function extractTextContent(value: unknown): string {
  if (!value) return "";

  // If it's a string, return it directly
  if (typeof value === "string") return value;

  // If it's an object with content property (common in xml2js)
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    // CDATA is often stored in a property named _ or content
    if ("_" in obj && obj._ !== undefined) return String(obj._);
    if ("content" in obj && obj.content !== undefined)
      return String(obj.content);
    if ("text" in obj && obj.text !== undefined) return String(obj.text);

    // If it has a cdata property
    if ("cdata" in obj && obj.cdata !== undefined) return String(obj.cdata);

    // Last resort - try to convert to string
    if (
      "toString" in obj &&
      typeof obj.toString === "function" &&
      obj.toString() !== "[object Object]"
    ) {
      return obj.toString();
    }
  }

  // If we can't extract text, return empty string
  return "";
}

/**
 * Get the link from an Atom link object or array
 */
function getAtomLink(link: unknown): string {
  if (!link) return "";
  if (typeof link === "string") return link;

  if (Array.isArray(link)) {
    // Prioritize alternate HTML links, then self, then first link
    const alternateLink = link.find((l) => {
      return (
        l &&
        typeof l === "object" &&
        "attr" in l &&
        l.attr &&
        typeof l.attr === "object" &&
        l.attr &&
        "rel" in l.attr &&
        (l.attr.rel === "alternate" || !l.attr.rel) &&
        "type" in l.attr &&
        l.attr.type === "text/html"
      );
    });
    if (
      alternateLink &&
      typeof alternateLink === "object" &&
      "attr" in alternateLink &&
      alternateLink.attr &&
      typeof alternateLink.attr === "object" &&
      "href" in alternateLink.attr
    ) {
      return alternateLink.attr.href as string;
    }

    const selfLink = link.find((l) => {
      return (
        l &&
        typeof l === "object" &&
        "attr" in l &&
        l.attr &&
        typeof l.attr === "object" &&
        "rel" in l.attr &&
        l.attr.rel === "self"
      );
    });
    if (
      selfLink &&
      typeof selfLink === "object" &&
      "attr" in selfLink &&
      selfLink.attr &&
      typeof selfLink.attr === "object" &&
      "href" in selfLink.attr
    ) {
      return selfLink.attr.href as string;
    }

    // Fallback to the first link's href
    return link[0] &&
      typeof link[0] === "object" &&
      "attr" in link[0] &&
      link[0].attr &&
      typeof link[0].attr === "object" &&
      "href" in link[0].attr
      ? (link[0].attr.href as string)
      : "";
  }

  // Handle single link object
  if (
    link &&
    typeof link === "object" &&
    "attr" in link &&
    link.attr &&
    typeof link.attr === "object" &&
    "href" in link.attr
  ) {
    return link.attr.href as string;
  }

  return "";
}

/**
 * Normalize an RSS item
 */
function normalizeItem(item: Record<string, unknown>): CustomItem {
  const guidValue =
    item.guid && typeof item.guid === "object" && "content" in item.guid
      ? (item.guid.content as string)
      : (item.guid as string);
  const linkValue = item.link as string;

  // Try to extract categories robustly
  let categories: string[] = [];
  if (item.category) {
    if (Array.isArray(item.category)) {
      categories = item.category
        .map((cat: unknown) =>
          typeof cat === "object" && cat !== null && "content" in cat
            ? (cat.content as string)
            : (cat as string),
        )
        .filter(Boolean);
    } else if (
      typeof item.category === "object" &&
      item.category !== null &&
      "content" in item.category
    ) {
      categories = [item.category.content as string].filter(Boolean);
    } else {
      categories = [item.category as string].filter(Boolean);
    }
  }

  // Better author extraction - check multiple fields
  let author =
    (item.author as string) ||
    (item.creator as string) ||
    (item["dc:creator"] as string);
  let authors: string[] = [];

  if (author) {
    authors = [author];
  } else if (item.authors && Array.isArray(item.authors)) {
    authors = item.authors as string[];
  }

  // Better content extraction
  const content =
    extractTextContent(item.content) ||
    extractTextContent(item["content:encoded"]) ||
    extractTextContent(item.description) ||
    "";

  return {
    title: extractTextContent(item.title) || "",
    content: content,
    contentSnippet: extractTextContent(item.description) || "",
    link: linkValue || "",
    guid: guidValue || linkValue || "", // Ensure GUID has a fallback
    pubDate:
      (item.pubDate as string) ||
      (item.pubdate as string) ||
      (item.date as string), // Handle variations
    author: author,
    authors: authors.filter(Boolean), // Filter out empty values
    categories: categories,
    isoDate: item.isoDate as string, // Often added by rss-parser, might be missing in manual parse
  };
}

/**
 * Normalize an Atom entry
 */
function normalizeAtomEntry(entry: Record<string, unknown>): CustomItem {
  // Handle potential object structure for title, content, summary
  const title = extractTextContent(entry.title);
  const content = extractTextContent(entry.content);
  const summary = extractTextContent(entry.summary);

  const link = getAtomLink(entry.link);
  const guid = (entry.id as string) || link; // Use link as fallback GUID for Atom

  // Robust author extraction
  let authors: string[] = [];
  if (entry.author) {
    if (Array.isArray(entry.author)) {
      authors = (entry.author as Array<Record<string, unknown>>)
        .map((a) => a.name as string)
        .filter(Boolean);
    } else if (
      typeof entry.author === "object" &&
      entry.author !== null &&
      "name" in entry.author
    ) {
      authors = [entry.author.name as string];
    }
  }

  // Robust category extraction
  let categories: string[] = [];
  if (entry.category) {
    if (Array.isArray(entry.category)) {
      categories = (entry.category as Array<Record<string, unknown>>)
        .map((c) => {
          if (
            typeof c === "object" &&
            c !== null &&
            "attr" in c &&
            c.attr &&
            typeof c.attr === "object" &&
            "term" in c.attr
          ) {
            return c.attr.term as string;
          }
          return c as string;
        })
        .filter(Boolean);
    } else if (
      typeof entry.category === "object" &&
      entry.category !== null &&
      "attr" in entry.category &&
      entry.category.attr &&
      typeof entry.category.attr === "object" &&
      "term" in entry.category.attr
    ) {
      categories = [entry.category.attr.term as string];
    } else if (typeof entry.category === "string") {
      categories = [entry.category];
    }
  }

  return {
    title: title || "",
    content: content || summary || "", // Use summary if content is missing
    contentSnippet: summary || "",
    link: link,
    guid: guid,
    pubDate: (entry.published as string) || (entry.updated as string), // Atom uses published or updated
    isoDate: (entry.published as string) || (entry.updated as string),
    author: authors.length > 0 ? authors[0] : undefined, // First author if multiple
    authors: authors,
    categories: categories,
  };
}

/**
 * Bulk-upsert helper: Inserts distinct names and returns a name→ID map
 */
async function upsertNames(
  table: string,
  keyCol: string,
  names: string[],
): Promise<Record<string, number>> {
  const uniq = Array.from(new Set(names));
  if (!uniq.length) return {};
  const placeholders = uniq.map(() => "(?)").join(",");
  await executeQuery({
    query: `INSERT IGNORE INTO ${table} (${keyCol}) VALUES ${placeholders}`,
    values: uniq,
  });
  const rows: Array<{ id: number; name: string }> = await executeQuery({
    query: `
      SELECT ${table.slice(0, -1)}ID AS id, ${keyCol} AS name
      FROM ${table}
      WHERE ${keyCol} IN (?)
    `,
    values: [uniq],
  });
  return rows.reduce(
    (m, r) => ((m[r.name] = r.id), m),
    {} as Record<string, number>,
  );
}

/**
 * Process and save a feed to the database
 */
export async function processFeed(
  feedUrl: string,
  userId?: number,
): Promise<{ success: boolean; message: string; feedId?: number }> {
  return comprehensiveFeedProcessor(feedUrl, userId);
}
/**
 * Get recent feed items for a user, based on their subscriptions
 */
export async function getUserFeedItems(userId: number, limit = 20, offset = 0) {
  try {
    const items = await executeQuery({
      query: `
        SELECT
          fi.ItemID, fi.Title, fi.Content, fi.PubDate, fi.Link, fi.IsRead,
          f.FeedID, f.Title as FeedTitle,
          GROUP_CONCAT(DISTINCT a.Name SEPARATOR ', ') as Authors,
          p.Name as PublisherName
        FROM FeedItems fi
        JOIN Feeds f ON fi.FeedID = f.FeedID
        JOIN Subscriptions s ON f.FeedID = s.FeedID
        LEFT JOIN FeedItemAuthors fia ON fi.ItemID = fia.ItemID
        LEFT JOIN Authors a ON fia.AuthorID = a.AuthorID
        LEFT JOIN FeedItemPublishers fip ON fi.ItemID = fip.ItemID
        LEFT JOIN Publishers p ON fip.PublisherID = p.PublisherID
        WHERE s.UserID = ?
        GROUP BY fi.ItemID
        ORDER BY fi.PubDate DESC, fi.ItemID DESC # Add ItemID as secondary sort for stable ordering
        LIMIT ? OFFSET ?
      `,
      values: [userId, limit, offset],
    });

    // Ensure items is an array
    const resultsArray = Array.isArray(items) ? items : [];

    return { success: true, items: resultsArray };
  } catch (error: unknown) {
    // Use unknown for caught errors
    console.error("Error fetching user feed items:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error fetching feed items",
    };
  }
}

export async function getUserSubscriptions(userId: number) {
  try {
    const subscriptions = await executeQuery({
      query: `
        SELECT
          f.FeedID,
          f.Title,
          f.Description,
          f.FeedURL,
          f.LastFetchedAt,
          COUNT(DISTINCT fi.ItemID) as ItemCount,
          COUNT(DISTINCT CASE WHEN fi.IsRead = 0 THEN fi.ItemID ELSE NULL END) as UnreadCount
        FROM Subscriptions s
        JOIN Feeds f ON s.FeedID = f.FeedID
        LEFT JOIN FeedItems fi ON f.FeedID = fi.FeedID
        WHERE s.UserID = ?
        GROUP BY f.FeedID, f.Title, f.Description, f.FeedURL, f.LastFetchedAt
        ORDER BY f.Title
      `,
      values: [userId],
    });

    // Ensure subscriptions is an array
    const resultsArray = Array.isArray(subscriptions) ? subscriptions : [];

    // Properly format the data for the frontend
    const formattedSubscriptions = resultsArray.map((sub) => ({
      FeedID: Number(sub.FeedID),
      Title: sub.Title || "Untitled Feed",
      Description: sub.Description || "",
      FeedURL: sub.FeedURL,
      LastFetchedAt: sub.LastFetchedAt
        ? new Date(sub.LastFetchedAt).toISOString()
        : null,
      ItemCount: parseInt(sub.ItemCount || "0", 10),
      UnreadCount: parseInt(sub.UnreadCount || "0", 10),
    }));

    return { success: true, subscriptions: formattedSubscriptions };
  } catch (error: unknown) {
    console.error("Error fetching user subscriptions:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error fetching subscriptions",
    };
  }
}
