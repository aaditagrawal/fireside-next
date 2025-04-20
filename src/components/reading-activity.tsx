"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ReadingData {
  day: string;
  count: number;
}

interface ReadingActivityProps {
  userId: number;
}

export function ReadingActivity({ userId }: ReadingActivityProps) {
  const [activityData, setActivityData] = useState<ReadingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxCount, setMaxCount] = useState(0);

  useEffect(() => {
    const fetchReadingActivity = async () => {
      if (!userId) return;

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/stats/reading-activity?userId=${userId}`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch reading activity: ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (data.success) {
          setActivityData(data.activity || []);
          // Find the max count for scaling
          const max = Math.max(
            ...data.activity.map((d: ReadingData) => d.count),
            0,
          );
          setMaxCount(max);
        } else {
          setError(data.error || "Failed to fetch reading activity");
        }
      } catch (err) {
        console.error("Error fetching reading activity:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReadingActivity();
  }, [userId]);

  // Calculate the height of a bar based on the count and max count
  const getBarHeight = (count: number) => {
    if (maxCount === 0) return 0;
    const minHeight = 10; // Minimum height for bars with at least 1 read
    const maxHeight = 120; // Maximum height for bars

    if (count === 0) return 0;
    return minHeight + (count / maxCount) * (maxHeight - minHeight);
  };

  // Get day name from date
  const getDayName = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      // Check if the date is valid before formatting
      if (isNaN(date.getTime())) {
        console.error(`Invalid date string: ${dateStr}`);
        return "Invalid";
      }
      return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
        date,
      );
    } catch (error) {
      console.error(`Error formatting date: ${dateStr}`, error);
      return "Error";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reading Activity</CardTitle>
          <CardDescription>Articles read in the last 7 days</CardDescription>
        </CardHeader>
        <CardContent className="h-48">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reading Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading activity: {error}</p>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (activityData.length === 0 || maxCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reading Activity</CardTitle>
          <CardDescription>Articles read in the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No reading activity recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reading Activity</CardTitle>
        <CardDescription>Articles read in the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-end justify-between space-x-2">
          {activityData.map((day) => (
            <div key={day.day} className="flex flex-col items-center">
              <div
                className="w-10 bg-primary rounded-t transition-all duration-500 ease-in-out"
                style={{
                  height: `${getBarHeight(day.count)}px`,
                  opacity: day.count > 0 ? 1 : 0.3,
                }}
              />
              <div className="mt-2 text-xs text-muted-foreground">
                {getDayName(day.day)}
              </div>
              <div className="text-xs font-medium">{day.count}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
