"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryData {
  category: string;
  count: number;
}

interface CategoryRadarChartProps {
  userId: number;
}

const chartConfig = {
  count: {
    label: "Article Count",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function CategoryRadarChart({ userId }: CategoryRadarChartProps) {
  const [chartData, setChartData] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trend, setTrend] = useState<{
    percentage: number;
    increasing: boolean;
  }>({
    percentage: 0,
    increasing: true,
  });

  useEffect(() => {
    const fetchCategoryDistribution = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/stats/category-distribution?userId=${userId}`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch category distribution: ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (data.success) {
          setChartData(data.categories || []);
          setTrend({
            percentage: data.trend?.percentage || 0,
            increasing: data.trend?.increasing || false,
          });
        } else {
          setError(data.error || "Failed to fetch category distribution");
        }
      } catch (err) {
        console.error("Error fetching category distribution:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategoryDistribution();
  }, [userId]);

  return (
    <Card>
      <CardHeader className="items-center pb-4">
        <CardTitle>Category Distribution</CardTitle>
        <CardDescription>Your reading interests by category</CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        {isLoading ? (
          <Skeleton className="mx-auto aspect-square h-[250px]" />
        ) : error ? (
          <div className="flex h-[250px] w-full items-center justify-center text-destructive">
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[250px] w-full items-center justify-center text-muted-foreground">
            No category data available
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <RadarChart data={chartData}>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <PolarGrid fill="var(--color-count)" fillOpacity={0.2} />
              <PolarAngleAxis dataKey="category" />
              <Radar
                dataKey="count"
                fill="var(--color-count)"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          {trend.increasing ? (
            <>
              Trending up by {trend.percentage.toFixed(1)}% this month{" "}
              <TrendingUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Trending down by {trend.percentage.toFixed(1)}% this month{" "}
              <TrendingDown className="h-4 w-4" />
            </>
          )}
        </div>
        <div className="flex items-center gap-2 leading-none text-muted-foreground">
          Based on your recent reading habits
        </div>
      </CardFooter>
    </Card>
  );
}
