"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RssIcon, Plus } from "lucide-react";

interface FeedRecommendation {
  FeedID: number;
  Title: string;
  Description: string;
  FeedURL: string;
  ItemCount: number;
  CategoryName: string;
  FrecencyScore: number;
}

interface FeedRecommendationsProps {
  userId: number;
}

export function FeedRecommendations({ userId }: FeedRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<FeedRecommendation[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribingTo, setSubscribingTo] = useState<number | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!userId) return;

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/feeds/recommendations`);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch recommendations: ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (data.success) {
          setRecommendations(data.recommendations || []);
        } else {
          setError(data.error || "Failed to fetch recommendations");
        }
      } catch (err) {
        console.error("Error fetching feed recommendations:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId]);

  const handleSubscribe = async (feedUrl: string, feedId: number) => {
    try {
      setSubscribingTo(feedId);

      const response = await fetch("/api/feeds/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedUrl }),
      });

      if (!response.ok) {
        throw new Error(`Failed to subscribe: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Remove this feed from recommendations
        setRecommendations((prev) =>
          prev.filter((rec) => rec.FeedID !== feedId),
        );
      } else {
        throw new Error(data.error || "Failed to subscribe");
      }
    } catch (err) {
      console.error("Error subscribing to feed:", err);
      // Show error or toast notification here
    } finally {
      setSubscribingTo(null);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommended Feeds</CardTitle>
          <CardDescription>Based on your reading habits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-60" />
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommended Feeds</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">
            Error loading recommendations: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommended Feeds</CardTitle>
          <CardDescription>Based on your reading habits</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No feed recommendations available. Try exploring more content.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended Feeds</CardTitle>
        <CardDescription>Based on your reading habits</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.slice(0, 5).map((feed, idx) => (
            <div
              key={`${feed.FeedID}-${idx}`}
              className="flex justify-between items-start border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex-1 space-y-1">
                <div className="font-medium flex items-center">
                  <RssIcon className="h-4 w-4 mr-2 text-primary" />
                  {feed.Title}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-muted px-2 py-0.5 rounded-full">
                    {feed.CategoryName}
                  </span>
                  <span>{feed.ItemCount} articles</span>
                </div>
                {feed.Description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {feed.Description}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 ml-2"
                onClick={() => handleSubscribe(feed.FeedURL, feed.FeedID)}
                disabled={subscribingTo === feed.FeedID}
              >
                <Plus className="h-4 w-4 mr-1" />
                {subscribingTo === feed.FeedID ? "Adding..." : "Subscribe"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          disabled={recommendations.length <= 5}
        >
          Show More Recommendations
        </Button>
      </CardFooter>
    </Card>
  );
}
