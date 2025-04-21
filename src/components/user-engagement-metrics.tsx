"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Award, BookOpen, Bookmark, BarChart2 } from "lucide-react";

interface UserEngagementProps {
  userId: number;
}

export function UserEngagementMetrics({ userId }: UserEngagementProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<{
    TotalReads: number;
    TotalSaves: number;
    FavoriteCategory: string | null;
    AvgDailyReads: number;
    EngagementLevel: string;
    EngagementScore: number;
  } | null>(null);

  useEffect(() => {
    const fetchEngagement = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/stats/engagement?userId=${userId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch engagement: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          setEngagement(data.engagement);
        } else {
          setError(data.error || "Failed to fetch engagement metrics");
        }
      } catch (err) {
        console.error("Error fetching engagement metrics:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEngagement();
  }, [userId]);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reader Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
          <CardTitle>Reader Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!engagement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reader Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">
            No engagement data available
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get badge color based on engagement level
  const getBadgeColor = (level: string) => {
    switch (level) {
      case "Power User":
        return "bg-green-500 hover:bg-green-600";
      case "Active User":
        return "bg-blue-500 hover:bg-blue-600";
      case "Casual Reader":
        return "bg-yellow-500 hover:bg-yellow-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">Reader Engagement</CardTitle>
        <Badge className={getBadgeColor(engagement.EngagementLevel)}>
          {engagement.EngagementLevel}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <div>
              <p className="text-muted-foreground text-xs">Articles Read</p>
              <p className="text-lg font-bold">{engagement.TotalReads}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            <div>
              <p className="text-muted-foreground text-xs">Saved</p>
              <p className="text-lg font-bold">{engagement.TotalSaves}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            <div>
              <p className="text-muted-foreground text-xs">Daily Average</p>
              <p className="text-lg font-bold">
                {Number(engagement.AvgDailyReads).toFixed(1)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <div>
              <p className="text-muted-foreground text-xs">Engagement Score</p>
              <p className="text-lg font-bold">{engagement.EngagementScore}</p>
            </div>
          </div>
        </div>
        {engagement.FavoriteCategory && (
          <div className="mt-4 border-t pt-3">
            <p className="text-muted-foreground text-xs">Favorite Category</p>
            <p className="text-sm font-medium">{engagement.FavoriteCategory}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
