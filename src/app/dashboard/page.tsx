"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { NavActions } from "@/components/nav-actions";
import { LogoutButton } from "@/components/logout-button";
import { DashboardStats } from "@/components/dashboard-stats";
import { ArticleCarousel } from "@/components/article-carousel";
import { FeedRecommendations } from "@/components/feed-recommendations";
import { AddFeedForm } from "@/components/add-feed-form";
import { ReadingActivityChart } from "@/components/reading-activity-chart";
import { CategoryRadarChart } from "@/components/category-radar-chart";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: number;
    name: string;
    email: string;
    role?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State for article carousels
  const [trendingArticles, setTrendingArticles] = useState([]);
  const [recommendedArticles, setRecommendedArticles] = useState([]);
  const [recentArticles, setRecentArticles] = useState([]);
  const [savedArticles, setSavedArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState({
    trending: true,
    recommended: true,
    recent: true,
    saved: true,
  });
  const [articlesError, setArticlesError] = useState<{
    trending: string | null;
    recommended: string | null;
    recent: string | null;
    saved: string | null;
  }>({
    trending: null,
    recommended: null,
    recent: null,
    saved: null,
  });

  // Session check
  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/auth/session");

        if (!response.ok) {
          throw new Error(`Session check failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.user) {
          setUser(data.user);
        } else {
          console.log("No user in session, redirecting to login");
          router.push("/login");
        }
      } catch (error) {
        console.error("Session check error:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [router]);

  // Fetch articles for each carousel
  useEffect(() => {
    const fetchArticles = async () => {
      if (!user) return;

      // Fetch trending articles
      try {
        setArticlesLoading((prev) => ({ ...prev, trending: true }));
        setArticlesError((prev) => ({ ...prev, trending: null }));

        const response = await fetch("/api/articles/trending");
        if (!response.ok) {
          throw new Error(
            `Failed to fetch trending articles: ${response.statusText}`,
          );
        }

        const data = await response.json();
        if (data.success) {
          setTrendingArticles(data.articles || []);
        } else {
          throw new Error(data.error || "Failed to fetch trending articles");
        }
      } catch (error) {
        console.error("Error fetching trending articles:", error);
        setArticlesError((prev) => ({
          ...prev,
          trending:
            error instanceof Error
              ? error.message
              : "Failed to load trending articles",
        }));
      } finally {
        setArticlesLoading((prev) => ({ ...prev, trending: false }));
      }

      // Fetch recommended articles
      try {
        setArticlesLoading((prev) => ({ ...prev, recommended: true }));
        setArticlesError((prev) => ({ ...prev, recommended: null }));

        const response = await fetch("/api/articles/recommended");
        if (!response.ok) {
          throw new Error(
            `Failed to fetch recommended articles: ${response.statusText}`,
          );
        }

        const data = await response.json();
        if (data.success) {
          setRecommendedArticles(data.articles || []);
        } else {
          throw new Error(data.error || "Failed to fetch recommended articles");
        }
      } catch (error) {
        console.error("Error fetching recommended articles:", error);
        setArticlesError((prev) => ({
          ...prev,
          recommended:
            error instanceof Error
              ? error.message
              : "Failed to load recommended articles",
        }));
      } finally {
        setArticlesLoading((prev) => ({ ...prev, recommended: false }));
      }

      // Fetch recent articles
      try {
        setArticlesLoading((prev) => ({ ...prev, recent: true }));
        setArticlesError((prev) => ({ ...prev, recent: null }));

        const response = await fetch("/api/articles/recent");
        if (!response.ok) {
          throw new Error(
            `Failed to fetch recent articles: ${response.statusText}`,
          );
        }

        const data = await response.json();
        if (data.success) {
          setRecentArticles(data.articles || []);
        } else {
          throw new Error(data.error || "Failed to fetch recent articles");
        }
      } catch (error) {
        console.error("Error fetching recent articles:", error);
        setArticlesError((prev) => ({
          ...prev,
          recent:
            error instanceof Error
              ? error.message
              : "Failed to load recent articles",
        }));
      } finally {
        setArticlesLoading((prev) => ({ ...prev, recent: false }));
      }

      // Fetch saved articles
      try {
        setArticlesLoading((prev) => ({ ...prev, saved: true }));
        setArticlesError((prev) => ({ ...prev, saved: null }));

        const response = await fetch("/api/articles/saved");
        if (!response.ok) {
          throw new Error(
            `Failed to fetch saved articles: ${response.statusText}`,
          );
        }

        const data = await response.json();
        if (data.success) {
          setSavedArticles(data.articles || []);
        } else {
          throw new Error(data.error || "Failed to fetch saved articles");
        }
      } catch (error) {
        console.error("Error fetching saved articles:", error);
        setArticlesError((prev) => ({
          ...prev,
          saved:
            error instanceof Error
              ? error.message
              : "Failed to load saved articles",
        }));
      } finally {
        setArticlesLoading((prev) => ({ ...prev, saved: false }));
      }
    };

    fetchArticles();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1 flex items-center">
                    <Home className="mr-2 h-4 w-4" />
                    Dashboard
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-4 px-3">
            <div className="text-sm text-muted-foreground">
              Welcome, {user.name}
            </div>
            <LogoutButton />
            <NavActions />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Stats Row */}
          <DashboardStats userId={user.id} />

          {/* Data Visualization Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReadingActivityChart userId={user.id} />
            <CategoryRadarChart userId={user.id} />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Recent Articles Carousel */}
              <ArticleCarousel
                title="Recently Published"
                description="Latest articles from your subscribed feeds"
                articles={recentArticles}
                isLoading={articlesLoading.recent}
                error={articlesError.recent}
                viewAllHref="/articles"
                carouselId="recent-articles"
                emptyMessage="No recent articles. Try subscribing to more feeds."
              />

              {/* Recommended Articles Carousel */}
              <ArticleCarousel
                title="Recommended For You"
                description="Based on your reading preferences"
                articles={recommendedArticles}
                isLoading={articlesLoading.recommended}
                error={articlesError.recommended}
                carouselId="recommended-articles"
                emptyMessage="We'll learn your preferences as you read more articles."
              />

              {/* Trending Articles Carousel */}
              <ArticleCarousel
                title="Trending"
                description="Popular articles from your feeds"
                articles={trendingArticles}
                isLoading={articlesLoading.trending}
                error={articlesError.trending}
                carouselId="trending-articles"
                emptyMessage="No trending articles yet."
              />

              {/* Saved Articles Carousel */}
              <ArticleCarousel
                title="Your Saved Articles"
                description="Articles you've bookmarked for later"
                articles={savedArticles}
                isLoading={articlesLoading.saved}
                error={articlesError.saved}
                carouselId="saved-articles"
                emptyMessage="You haven't saved any articles yet."
              />
            </div>

            {/* Sidebar Content */}
            <div className="space-y-6">
              {/* Add Feed Form */}
              <AddFeedForm
                userId={user.id}
                onFeedAdded={() => {
                  // Refresh Recent Articles when a new feed is added
                  setArticlesLoading((prev) => ({ ...prev, recent: true }));
                  fetch("/api/articles/recent")
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.success) {
                        setRecentArticles(data.articles || []);
                      }
                      setArticlesLoading((prev) => ({
                        ...prev,
                        recent: false,
                      }));
                    })
                    .catch((err) => {
                      console.error(
                        "Error refreshing articles after adding feed:",
                        err,
                      );
                      setArticlesLoading((prev) => ({
                        ...prev,
                        recent: false,
                      }));
                    });
                }}
              />

              {/* Feed Recommendations */}
              <FeedRecommendations userId={user.id} />

              {/* Useful Links */}
              <div className="flex flex-wrap gap-2">
                <Link href="/articles">
                  <Button variant="outline" size="sm">All Articles</Button>
                </Link>
                <Link href="/feeds">
                  <Button variant="outline" size="sm">Manage Feeds</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
