"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarIcon,
  BookOpenIcon,
  BookmarkIcon,
  Share2Icon,
  ThumbsUpIcon,
  UserIcon,
  GlobeIcon,
} from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

interface FeedArticleViewerProps {
  articleId?: number;
  content?: string;
  title?: string;
  authors?: string;
  publisherName?: string;
  pubDate?: string;
  link?: string;
  onBack?: () => void;
}

export function FeedArticleViewer({
  articleId,
  content: initialContent,
  title: initialTitle = "Untitled Article",
  authors: initialAuthors,
  publisherName: initialPublisherName,
  pubDate: initialPubDate,
  link: initialLink,
  onBack,
}: FeedArticleViewerProps) {
  const [articleData, setArticleData] = useState({
    title: initialTitle,
    authors: initialAuthors,
    publisherName: initialPublisherName,
    pubDate: initialPubDate,
    content: initialContent,
    link: initialLink,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch article if articleId is provided but no content
  useEffect(() => {
    const fetchArticle = async () => {
      if (!articleId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/feeds/article?id=${articleId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch article: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.article) {
          setArticleData({
            content: data.article.Content || "",
            title: data.article.Title || "Untitled Article",
            authors: data.article.Authors || "",
            publisherName: data.article.PublisherName || "",
            pubDate: data.article.PubDate || "",
            link: data.article.Link || "",
            isSaved: data.article.IsSaved,
            likeCount: data.article.LikeCount,
            userLiked: data.article.UserLiked,
          });

          // Record a read interaction
          await fetch("/api/items/interact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId: articleId,
              type: "read",
            }),
          });
        } else {
          setError(data.error || "Failed to load article");
        }
      } catch (err) {
        console.error("Error fetching article:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
      } finally {
        setIsLoading(false);
      }
    };

    // If initial props include full content, skip fetch
    if (!initialContent) {
      fetchArticle();
    } else {
      setIsLoading(false);

      // If articleId is available but we already have content, still record the read
      if (articleId) {
        fetch("/api/items/interact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: articleId,
            type: "read",
          }),
        }).catch((err) => console.error("Failed to record read:", err));
      }
    }
  }, [articleId, initialContent]);

  // Format the publication date
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (e) {
      return dateString; // Fallback to original string if parsing fails
    }
  };

  // Sanitize HTML content to prevent XSS attacks
  const sanitizeContent = (htmlContent: string) => {
    return DOMPurify.sanitize(htmlContent, {
      ADD_TAGS: ["iframe"], // Allow iframes for embedded content
      ADD_ATTR: ["allowfullscreen", "frameborder", "src"], // Allow specific iframe attributes
      FORBID_TAGS: ["script", "style", "form", "input", "textarea"], // Explicitly forbid risky tags
    });
  };

  // Style the content with custom CSS
  const articleStyles = `
    .feed-article-content {
      font-family: var(--font-geist-sans);
      line-height: 1.7;
      color: var(--foreground);
    }

    .feed-article-content p {
      margin-bottom: 1rem;
    }

    .feed-article-content h1,
    .feed-article-content h2,
    .feed-article-content h3,
    .feed-article-content h4,
    .feed-article-content h5,
    .feed-article-content h6 {
      font-weight: 600;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
      line-height: 1.3;
    }

    .feed-article-content h1 { font-size: 1.8rem; }
    .feed-article-content h2 { font-size: 1.5rem; }
    .feed-article-content h3 { font-size: 1.3rem; }
    .feed-article-content h4 { font-size: 1.15rem; }
    .feed-article-content h5 { font-size: 1.05rem; }
    .feed-article-content h6 { font-size: 1rem; }

    .feed-article-content img {
      max-width: 100%;
      height: auto;
      border-radius: 0.375rem;
      margin: 1rem 0;
    }

    .feed-article-content a {
      color: var(--primary);
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 2px;
    }

    .feed-article-content a:hover {
      text-decoration-thickness: 2px;
    }

    .feed-article-content ul,
    .feed-article-content ol {
      margin-bottom: 1rem;
      padding-left: 1.5rem;
    }

    .feed-article-content ul { list-style-type: disc; }
    .feed-article-content ol { list-style-type: decimal; }

    .feed-article-content li {
      margin-bottom: 0.5rem;
    }

    .feed-article-content blockquote {
      border-left: 3px solid var(--muted);
      padding-left: 1rem;
      margin-left: 0;
      margin-right: 0;
      font-style: italic;
      color: var(--muted-foreground);
    }

    .feed-article-content pre,
    .feed-article-content code {
      font-family: var(--font-geist-mono);
      background-color: var(--muted);
      border-radius: 0.25rem;
    }

    .feed-article-content pre {
      padding: 1rem;
      overflow-x: auto;
      margin-bottom: 1rem;
    }

    .feed-article-content code {
      padding: 0.2rem 0.4rem;
    }

    .feed-article-content table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
    }

    .feed-article-content th,
    .feed-article-content td {
      border: 1px solid var(--border);
      padding: 0.5rem;
    }

    .feed-article-content th {
      background-color: var(--muted);
      font-weight: 600;
    }

    .feed-article-content iframe {
      max-width: 100%;
      border: none;
      margin: 1rem 0;
      border-radius: 0.375rem;
    }

    .feed-article-content hr {
      border: 0;
      height: 1px;
      background-color: var(--border);
      margin: 1.5rem 0;
    }

    @media (max-width: 640px) {
      .feed-article-content h1 { font-size: 1.5rem; }
      .feed-article-content h2 { font-size: 1.3rem; }
      .feed-article-content h3 { font-size: 1.2rem; }
      .feed-article-content img { margin: 0.75rem 0; }
    }
  `;

  if (isLoading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-4xl mx-auto border-destructive">
        <CardHeader>
          <CardTitle>Error Loading Article</CardTitle>
          <CardDescription>
            Unable to load the requested article
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <style>{articleStyles}</style>

      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle className="text-2xl md:text-3xl mb-2">
              {articleData.title}
            </CardTitle>
            <CardDescription className="flex flex-wrap gap-x-2 items-center text-sm">
              {articleData.publisherName && (
                <>
                  <div className="flex items-center gap-1.5">
                    <GlobeIcon className="h-3.5 w-3.5" />
                    <span className="font-medium">
                      {articleData.publisherName}
                    </span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                </>
              )}

              {articleData.authors && (
                <>
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5" />
                    <span>{articleData.authors}</span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                </>
              )}

              {articleData.pubDate && (
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>{formatDate(articleData.pubDate)}</span>
                </div>
              )}
            </CardDescription>
          </div>

          {onBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="shrink-0"
            >
              Back
            </Button>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="py-6">
        {articleData.content ? (
          <div
            className="feed-article-content"
            dangerouslySetInnerHTML={{
              __html: sanitizeContent(articleData.content),
            }}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpenIcon className="mx-auto h-12 w-12 opacity-30 mb-3" />
            <p>No content available for this article.</p>
            {articleData.link && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => window.open(articleData.link, "_blank")}
              >
                Visit Original Article
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <Separator />

      <CardFooter className="flex flex-wrap gap-4 justify-between py-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="group">
            <ThumbsUpIcon className="h-4 w-4 mr-2 group-hover:text-primary" />
            Like
          </Button>
          <Button variant="outline" size="sm" className="group">
            <BookmarkIcon className="h-4 w-4 mr-2 group-hover:text-primary" />
            Save
          </Button>
          <Button variant="outline" size="sm" className="group">
            <Share2Icon className="h-4 w-4 mr-2 group-hover:text-primary" />
            Share
          </Button>
        </div>

        {articleData.link && (
          <Button
            variant="default"
            size="sm"
            onClick={() => window.open(articleData.link, "_blank")}
          >
            Read Original
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
