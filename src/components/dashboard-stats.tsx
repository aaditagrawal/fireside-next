"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, BookOpen, Star, Clock, BarChart2 } from "lucide-react";

interface StatsProps {
  userId: number;
}

interface StatsData {
  totalArticles: number;
  readArticles: number;
  savedArticles: number;
  subscriptions: number;
  lastWeekReads: number;
}

export function DashboardStats({ userId }: StatsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) return;

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/stats/dashboard?userId=${userId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          setStats(data.stats);
        } else {
          setError(data.error || "Failed to fetch stats");
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="col-span-1">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading stats: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      title: "Total Articles",
      value: stats.totalArticles.toLocaleString(),
      icon: Newspaper,
      color: "text-blue-500",
    },
    {
      title: "Read Articles",
      value: stats.readArticles.toLocaleString(),
      icon: BookOpen,
      color: "text-green-500",
    },
    {
      title: "Saved Articles",
      value: stats.savedArticles.toLocaleString(),
      icon: Star,
      color: "text-amber-500",
    },
    {
      title: "Subscriptions",
      value: stats.subscriptions.toLocaleString(),
      icon: BarChart2,
      color: "text-indigo-500",
    },
    {
      title: "Last 7 Days",
      value: stats.lastWeekReads.toLocaleString(),
      icon: Clock,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statItems.map((item, index) => (
        <Card key={index} className="col-span-1">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
