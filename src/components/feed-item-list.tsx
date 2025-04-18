"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { RssIcon } from "lucide-react";

interface FeedItem {
  ItemID: number;
  Title: string;
  Content: string;
  PubDate: string;
  Link: string;
  FeedTitle: string;
  Authors?: string;
  PublisherName?: string;
  IsRead: boolean;
}

interface FeedItemListProps extends React.ComponentProps<"div"> {
  userId: number;
  feedId?: number; // Optional: to show items from a specific feed
}

export function FeedItemList({
  className,
  userId,
  feedId,
  ...props
}: FeedItemListProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<FeedItem[]>([]);

  // Fetch feed items
  const fetchItems = React.useCallback(async () => {
    if (!userId) return; // Don't fetch if no user ID

    try {
      setIsLoading(true);
      setErrorMessage(null); // Reset error message on new fetch
      let url = `/api/feeds/items?userId=${userId}`;

      // If feedId is provided, add it to the query
      if (feedId) {
        url += `&feedId=${feedId}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Ensure items is always an array
        setItems(Array.isArray(data.items) ? data.items : []);
      } else {
        setErrorMessage(data.error || "Failed to load feed items");
      }
    } catch (err) {
      console.error("Error fetching feed items:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An error occurred while loading feed items",
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId, feedId]); // Depend on both userId and feedId

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]); // fetchItems is now stable due to useCallback

  // Create a simple content snippet
  const createSnippet = (content: string, maxLength = 150) => {
    if (!content) return "";
    // Remove HTML tags
    const textContent = content.replace(/<[^>]*>/g, "");
    return textContent.length > maxLength
      ? textContent.substring(0, maxLength) + "..."
      : textContent;
  };

  // Format publication date
  const formatDate = (pubDate: string | null | undefined) => {
    if (!pubDate) return "No date";
    try {
      const date = new Date(pubDate);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", pubDate, error);
      return "Error formatting date";
    }
  };

  // Render skeleton loaders
  const renderSkeletons = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={`skel-${i}`}>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/3 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-5/6" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Render empty state
  const renderEmptyState = () => (
    <div className="bg-muted rounded-md p-6 text-center border">
      <RssIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
      <p className="text-muted-foreground mb-2">
        {feedId
          ? "No articles found in this feed yet."
          : "No RSS feed items found."}
      </p>
      {!feedId && (
        <p className="text-sm text-muted-foreground">
          Start by adding some RSS feeds using the "Add Feed" form in the
          dashboard.
        </p>
      )}
      {feedId && (
        <p className="text-sm text-muted-foreground">
          The feed might be new or hasn't published any articles recently. Try
          refreshing the feed.
        </p>
      )}
    </div>
  );

  // Render error message
  const renderError = () => (
    <div className="bg-destructive/10 text-destructive rounded-md p-4 border border-destructive/30">
      <p className="font-medium">Error loading articles:</p>
      <p className="text-sm">{errorMessage}</p>
    </div>
  );

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {/* Conditional Rendering */}
      {isLoading && renderSkeletons()}
      {errorMessage && !isLoading && renderError()}
      {!isLoading && !errorMessage && items.length === 0 && renderEmptyState()}

      {/* Render Items */}
      {!isLoading && !errorMessage && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <Card
              key={item.ItemID}
              className={cn(
                "transition-colors hover:bg-accent/50 dark:hover:bg-accent/20",
                item.IsRead ? "opacity-70" : "",
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  <Link
                    href={`/dashboard/article/${item.ItemID}`}
                    className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                  >
                    {item.Title || "Untitled Article"}
                  </Link>
                </CardTitle>
                <CardDescription className="text-xs">
                  {/* Conditionally show feed title only if not on a specific feed page */}
                  {!feedId && item.FeedTitle && (
                    <span className="font-medium">{item.FeedTitle}</span>
                  )}
                  {/* Combine author/publisher/date */}
                  {!feedId &&
                  item.FeedTitle &&
                  (item.Authors || item.PublisherName || item.PubDate)
                    ? " • "
                    : ""}
                  {item.Authors && `By ${item.Authors}`}
                  {item.Authors && (item.PublisherName || item.PubDate)
                    ? " • "
                    : ""}
                  {item.PublisherName && `${item.PublisherName}`}
                  {item.PublisherName && item.PubDate ? " • " : ""}
                  {item.PubDate && `${formatDate(item.PubDate)}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {createSnippet(item.Content)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
