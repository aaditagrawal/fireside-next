import React from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Calendar, BookOpen, Star } from "lucide-react";

interface ArticleProps {
  article: {
    ItemID: number;
    Title: string;
    Content?: string;
    CategoryName?: string;
    FeedTitle?: string;
    PubDate?: string;
    IsRead?: boolean;
    IsSaved?: boolean;
    Score?: number;
  };
}

export function ArticleCard({ article }: ArticleProps) {
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

  return (
    <Link
      href={`/dashboard/article/${article.ItemID}`}
      className="block h-full"
    >
      <Card
        className={`h-full hover:border-primary transition-colors ${article.IsRead ? "opacity-70" : ""}`}
      >
        <CardContent className="p-4 pb-2">
          <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {article.Title || "Untitled Article"}
          </h3>
          <div className="flex items-center gap-1 mb-2">
            {article.CategoryName && (
              <span className="bg-muted text-xs px-2 py-0.5 rounded-full">
                {article.CategoryName}
              </span>
            )}
            {article.FeedTitle && (
              <span className="text-xs truncate text-muted-foreground">
                {article.FeedTitle}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
            {createSnippet(article.Content)}
          </p>
        </CardContent>
        <CardFooter className="px-4 py-2 flex justify-between text-xs text-muted-foreground border-t">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(article.PubDate)}
          </div>
          <div className="flex items-center gap-2">
            {article.IsSaved && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span>Saved</span>
              </div>
            )}
            {article.Score !== undefined && (
              <div className="text-xs font-medium">
                Score: {article.Score.toFixed(1)}
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
