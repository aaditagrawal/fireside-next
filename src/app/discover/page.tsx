"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { ArticleCard } from "@/components/article-card";
import { TrendingUp, Sparkles, LineChart, PlusCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

import type { ArticleProps } from "@/components/article-card";

// Interface for emerging topics in DiscoverPage
interface EmergingTopic {
  CategoryID: number;
  CategoryName: string;
  Description?: string;
  ArticleCount: number;
}

export default function DiscoverPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: number;
    name: string;
    email: string;
    role?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // States for different discover content
  const [trendingArticles, setTrendingArticles] = useState<ArticleProps['article'][]>([]);
  const [similarUserContent, setSimilarUserContent] = useState<ArticleProps['article'][]>([]);
  const [emergingTopics, setEmergingTopics] = useState<EmergingTopic[]>([]);
  const [contentLoading, setContentLoading] = useState({
    trending: true,
    similar: true,
    emerging: true,
  });
  const [error, setError] = useState<string | null>(null);

  // Handle subscribe to category function
  const handleSubscribeToCategory = async (
    categoryId: number,
    categoryName: string,
  ) => {
    try {
      const response = await fetch("/api/categories/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ categoryId }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Subscribed to category",
          description: `You are now subscribed to ${data.subscriptions.length} feeds in the "${categoryName}" category`,
          action: (
            <ToastAction
              altText="View Feeds"
              onClick={() => router.push("/dashboard")}
            >
              View Feeds
            </ToastAction>
          ),
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to subscribe",
          description:
            data.error || "An error occurred while subscribing to the category",
        });
      }
    } catch (error) {
      console.error("Error subscribing to category:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to subscribe to category feeds. Please try again.",
      });
    }
  };

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

  // Fetch discover content
  useEffect(() => {
    const fetchDiscoverContent = async () => {
      if (!user) return;

      // Fetch trending content
      setContentLoading((prev) => ({ ...prev, trending: true }));
      try {
        const trendingRes = await fetch("/api/discover/trending");
        if (!trendingRes.ok)
          throw new Error("Failed to fetch trending content");
        const trendingData = await trendingRes.json();
        if (trendingData.success) {
          setTrendingArticles(trendingData.articles);
        }
      } catch (err) {
        console.error("Error fetching trending content:", err);
      } finally {
        setContentLoading((prev) => ({ ...prev, trending: false }));
      }

      // Fetch similar user content
      setContentLoading((prev) => ({ ...prev, similar: true }));
      try {
        const similarRes = await fetch("/api/discover/similar-users");
        if (!similarRes.ok)
          throw new Error("Failed to fetch similar user content");
        const similarData = await similarRes.json();
        if (similarData.success) {
          setSimilarUserContent(similarData.articles);
        }
      } catch (err) {
        console.error("Error fetching similar user content:", err);
      } finally {
        setContentLoading((prev) => ({ ...prev, similar: false }));
      }

      // Fetch emerging topics
      setContentLoading((prev) => ({ ...prev, emerging: true }));
      try {
        const emergingRes = await fetch("/api/discover/emerging-topics");
        if (!emergingRes.ok) throw new Error("Failed to fetch emerging topics");
        const emergingData = await emergingRes.json();
        if (emergingData.success) {
          setEmergingTopics(emergingData.topics);
        }
      } catch (err) {
        console.error("Error fetching emerging topics:", err);
      } finally {
        setContentLoading((prev) => ({ ...prev, emerging: false }));
      }
    };

    fetchDiscoverContent();
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
                    <Sparkles className="mr-2 h-4 w-4" />
                    Discover
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-4 px-3">
            <div className="text-sm text-muted-foreground">
              Welcome, {user.name}
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Logout
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6">
          <Tabs defaultValue="trending" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="trending" className="flex gap-2 items-center">
                <TrendingUp className="h-4 w-4" />
                <span>Trending Now</span>
              </TabsTrigger>
              <TabsTrigger value="similar" className="flex gap-2 items-center">
                <LineChart className="h-4 w-4" />
                <span>Similar Readers</span>
              </TabsTrigger>
              <TabsTrigger value="emerging" className="flex gap-2 items-center">
                <Sparkles className="h-4 w-4" />
                <span>Emerging Topics</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trending">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Trending Across the Platform
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {contentLoading.trending ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array(6)
                        .fill(0)
                        .map((_, i) => (
                          <div key={i} className="flex flex-col gap-2">
                            <Skeleton className="h-40 w-full rounded-lg" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        ))}
                    </div>
                  ) : trendingArticles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {trendingArticles.map((article) => (
                        <ArticleCard key={article.ItemID} article={article} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-12">
                      No trending articles found
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="similar">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <LineChart className="mr-2 h-5 w-5" />
                    Popular with Similar Readers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {contentLoading.similar ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array(6)
                        .fill(0)
                        .map((_, i) => (
                          <div key={i} className="flex flex-col gap-2">
                            <Skeleton className="h-40 w-full rounded-lg" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        ))}
                    </div>
                  ) : similarUserContent.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {similarUserContent.map((article) => (
                        <ArticleCard key={article.ItemID} article={article} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-12">
                      No recommended content from similar readers
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="emerging">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Emerging Topics & Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {contentLoading.emerging ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Array(6)
                        .fill(0)
                        .map((_, i) => (
                          <div key={i} className="flex flex-col gap-2">
                            <Skeleton className="h-24 w-full rounded-lg" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ))}
                    </div>
                  ) : emergingTopics.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {emergingTopics.map((topic) => (
                        <Card
                          key={topic.CategoryID}
                          className="hover:border-primary cursor-pointer transition-colors"
                        >
                          <CardContent className="pt-6">
                            <h3 className="text-lg font-semibold mb-2 flex items-center">
                              {topic.CategoryName}
                              <span className="ml-2 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                                {topic.ArticleCount} articles
                              </span>
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              {topic.Description ||
                                `Trending content about ${topic.CategoryName}`}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                handleSubscribeToCategory(
                                  topic.CategoryID,
                                  topic.CategoryName,
                                )
                              }
                            >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Explore Topic
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-12">
                      No emerging topics found
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
