"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddFeedFormProps extends React.ComponentProps<"div"> {
  userId?: number;
  onFeedAdded?: (feedId: number) => void;
}

export function AddFeedForm({
  className,
  userId,
  onFeedAdded,
  ...props
}: AddFeedFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [debugResult, setDebugResult] = React.useState<{
    success: boolean;
    feed?: any;
    error?: string;
  } | null>(null);
  const [feedUrl, setFeedUrl] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset states
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setDebugResult(null);

    // Basic validation
    if (!feedUrl) {
      setError("Please enter a feed URL");
      setIsLoading(false);
      return;
    }

    try {
      // Step 1: Debug the feed via API
      const debugRes = await fetch("/api/feeds/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: feedUrl }),
      });
      const debugData = await debugRes.json();
      setDebugResult(debugData);
      if (!debugData.success) {
        // Parsing failed, show debug error
        setError(
          debugData.error || "Failed to parse feed. Please check the URL.",
        );
        setIsLoading(false);
        return;
      }

      // Additional debug check to see what might be failing
      try {
        const detailedDebug = await fetch("/api/feeds/debug-add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: feedUrl }),
        });
        const detailedData = await detailedDebug.json();

        if (!detailedData.success) {
          console.error("Detailed debug error:", detailedData);
          setError(
            `Error at stage ${detailedData.stage}: ${detailedData.error}`,
          );
          setIsLoading(false);
          return;
        }

        console.log("Feed could be processed:", detailedData);
      } catch (detailedError) {
        console.error("Error running detailed debug:", detailedError);
      }

      // Step 2: Add the feed
      const response = await fetch("/api/feeds/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: feedUrl, userId }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(data.message || "Feed added successfully!");
        setFeedUrl("");
        if (onFeedAdded && data.feedId) {
          onFeedAdded(data.feedId);
        }
      } else {
        setError(data.error || "Failed to add feed. Please try again.");
      }
    } catch (err) {
      console.error("Error adding feed:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <div className="text-xl font-semibold">Add RSS Feed</div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 text-green-600 dark:text-green-400 rounded-md p-3 text-sm">
            {success}
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="feed-url">Feed URL</Label>
          <div className="flex">
            <Input
              id="feed-url"
              placeholder="https://example.com/feed.xml"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              className="flex-1 rounded-r-none"
              disabled={isLoading}
            />
            <Button
              type="submit"
              className="rounded-l-none"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Add Feed"}
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            Enter the URL of an RSS or Atom feed
          </p>
        </div>
      </form>
      {debugResult && (
        <div className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
          {debugResult.success ? (
            <div>
              <strong>Debug Success:</strong> {debugResult.feed.title} (
              {debugResult.feed.itemCount} items)
            </div>
          ) : (
            <div className="text-destructive">
              <strong>Debug Error:</strong> {debugResult.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
