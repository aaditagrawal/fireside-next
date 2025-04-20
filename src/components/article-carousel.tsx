"use client";

import React from "react";
import Link from "next/link";
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
import { ChevronLeft, ChevronRight, Calendar, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type ArticleType = {
  ItemID: number;
  Title: string;
  Content?: string;
  PubDate?: string;
  FeedTitle?: string;
  Authors?: string;
  PublisherName?: string;
  IsRead: boolean;
  IsSaved?: boolean;
  Score?: number;
  CategoryName?: string;
};

interface ArticleCarouselProps {
  title: string;
  description?: string;
  articles: ArticleType[];
  isLoading: boolean;
  error: string | null;
  viewAllHref?: string;
  emptyMessage?: string;
  carouselId: string; // Unique ID for carousel controls
}

export function ArticleCarousel({
  title,
  description,
  articles,
  isLoading,
  error,
  viewAllHref,
  emptyMessage = "No articles found",
  carouselId,
}: ArticleCarouselProps) {
  // State for carousel position
  const [activeIndex, setActiveIndex] = React.useState(0);

  // Function to scroll carousel
  const scroll = (direction: "left" | "right") => {
    if (direction === "left") {
      setActiveIndex((prev) => Math.max(0, prev - 1));
    } else {
      setActiveIndex((prev) =>
        Math.min(Math.max(0, articles.length - 3), prev + 1),
      );
    }
  };

  // Create a simple content snippet
  const createSnippet = (content: string | undefined, maxLength = 120) => {
    if (!content) return "";
    // Remove HTML tags
    const textContent = content.replace(/<[^>]*>/g, "");
    return textContent.length > maxLength
      ? textContent.substring(0, maxLength) + "..."
      : textContent;
  };

  // Format publication date
  const formatDate = (pubDate: string | undefined) => {
    if (!pubDate) return "";
    try {
      const date = new Date(pubDate);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch (error) {
      return "";
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="min-w-[300px] max-w-[300px] flex-none">
                <Skeleton className="h-40 w-full rounded-md" />
                <Skeleton className="h-4 w-3/4 mt-2" />
                <Skeleton className="h-3 w-1/2 mt-2" />
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Skeleton className="h-9 w-24" />
        </CardFooter>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (!articles || articles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {emptyMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="flex-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            disabled={activeIndex === 0}
            aria-label="Previous articles"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            disabled={activeIndex >= articles.length - 3}
            aria-label="Next articles"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          id={carouselId}
          className="flex space-x-4 overflow-hidden transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${activeIndex * 316}px)` }}
        >
          {articles.map((article, index) => (
            <Link
              href={`/dashboard/article/${article.ItemID}`}
              key={`${article.ItemID}-${index}`}
              className="min-w-[300px] max-w-[300px] flex-none group"
            >
              <Card
                className={cn(
                  "h-full border hover:border-primary/50 transition-colors",
                  article.IsRead ? "opacity-70" : "",
                )}
              >
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                    {article.Title || "Untitled Article"}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    {article.CategoryName && (
                      <span className="bg-muted text-xs px-2 py-0.5 rounded-full">
                        {article.CategoryName}
                      </span>
                    )}
                    {article.FeedTitle && (
                      <span className="text-xs truncate">
                        {article.FeedTitle}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {createSnippet(article.Content)}
                  </p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(article.PubDate)}
                  </div>
                  {article.IsSaved && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      Saved
                    </div>
                  )}
                  {article.Score !== undefined && (
                    <div className="text-xs font-medium">
                      Score: {article.Score.toFixed(1)}
                    </div>
                  )}
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      </CardContent>
      {viewAllHref && (
        <CardFooter>
          <Button variant="outline" asChild>
            <Link href={viewAllHref}>View All</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
