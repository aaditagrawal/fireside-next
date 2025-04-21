"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface ReadingData {
  date: string;
  savedCount: number;
  readCount: number;
}

interface ReadingActivityChartProps {
  userId: number;
}

const chartConfig = {
  activity: {
    label: "Reading Activity",
  },
  readCount: {
    label: "Articles Read",
    color: "var(--chart-1)",
  },
  savedCount: {
    label: "Articles Saved",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ReadingActivityChart({ userId }: ReadingActivityChartProps) {
  const [timeRange, setTimeRange] = React.useState("30d");
  const [chartData, setChartData] = React.useState<ReadingData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchReadingActivity = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get data from backend based on selected time range
        const response = await fetch(
          `/api/stats/reading-activity?userId=${userId}&timeRange=${timeRange}`,
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch reading activity: ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (data.success) {
          setChartData(data.activity || []);
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
  }, [userId, timeRange]);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Reading Activity</CardTitle>
          <CardDescription>Your reading patterns over time</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select time range"
          >
            <SelectValue placeholder="Last 30 days" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : error ? (
          <div className="flex h-[250px] w-full items-center justify-center text-destructive">
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[250px] w-full items-center justify-center text-muted-foreground">
            No reading activity data available
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fillReadCount" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-readCount)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-readCount)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillSavedCount" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-savedCount)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-savedCount)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="savedCount"
                type="natural"
                fill="url(#fillSavedCount)"
                stroke="var(--color-savedCount)"
                stackId="a"
              />
              <Area
                dataKey="readCount"
                type="natural"
                fill="url(#fillReadCount)"
                stroke="var(--color-readCount)"
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
