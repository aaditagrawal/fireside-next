"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { NavActions } from "@/components/nav-actions";
import { FeedItemList } from "@/components/feed-item-list";
import { LogoutButton } from "@/components/logout-button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbLink,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RssIcon, ArrowLeft, RefreshCw } from "lucide-react"; // Added RefreshCw
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton component
// Removed unused import: import { executeQuery } from "@/lib/db";

interface FeedDetails {
  FeedID: number;
  Title: string;
  Description: string;
  FeedURL: string;
  LastFetchedAt: string | null; // Allow null
}

export default function FeedPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  // Properly unwrap params if it's a Promise
  const unwrappedParams = React.use(params as Promise<{ id: string }>);
  const feedIdString = unwrappedParams.id;

  const router = useRouter();
  const [user, setUser] = useState<{
    id: number;
    name: string;
    email: string;
    role?: string;
  } | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isFeedLoading, setIsFeedLoading] = useState(true); // Separate loading state for feed
  const [isRefreshing, setIsRefreshing] = useState(false); // State for refresh button
  const [feed, setFeed] = useState<FeedDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Key to force FeedItemList re-render

  // Validate feedId early
  const feedId = parseInt(feedIdString, 10);

  // Handle invalid ID
  useEffect(() => {
    if (isNaN(feedId)) {
      setError("Invalid Feed ID provided.");
      setIsSessionLoading(false);
      setIsFeedLoading(false);
    }
  }, [feedId]);

  // Session check
  useEffect(() => {
    const checkSession = async () => {
      setIsSessionLoading(true); // Ensure loading state is true at the start
      setError(null); // Clear previous errors
      try {
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
        setError("Failed to verify session. Please try logging in again.");
        // Optionally redirect after a delay or let user click a button
        // router.push("/login");
      } finally {
        setIsSessionLoading(false);
      }
    };

    checkSession();
  }, [router]);

  // Fetch feed details - runs when user session is loaded and feedId is valid
  useEffect(() => {
    const fetchFeedDetails = async () => {
      if (!user || isNaN(feedId)) return; // Ensure user is loaded and feedId is valid

      setIsFeedLoading(true); // Start feed loading
      setError(null); // Clear previous errors
      try {
        const response = await fetch(`/api/feeds/details?feedId=${feedId}`);

        // Improved error handling
        if (!response.ok) {
          let errorMessage = `Failed to fetch feed: ${response.status} ${response.statusText}`;
          if (response.status === 404) {
            errorMessage =
              "Feed not found or you might not be subscribed to it.";
          } else if (response.status === 401 || response.status === 403) {
            errorMessage = "Authentication error or insufficient permissions.";
          } else {
            // Try to get more specific error from response body if available
            try {
              const errorData = await response.json();
              if (errorData && errorData.error) {
                errorMessage = errorData.error;
              }
            } catch (jsonError) {
              // Ignore if response is not JSON or doesn't contain 'error'
              console.warn(
                "Could not parse error response as JSON:",
                jsonError,
              );
            }
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data.success && data.feed) {
          setFeed(data.feed);
        } else {
          // Use error from API response if available, otherwise provide a default
          setError(
            data.error || "Failed to load feed details after successful fetch.",
          );
        }
      } catch (error) {
        console.error("Error fetching feed details:", error);
        setError(
          error instanceof Error
            ? error.message
            : "An unknown error occurred while fetching feed details.",
        );
      } finally {
        setIsFeedLoading(false); // End feed loading
      }
    };

    // Only fetch if session is not loading and user exists
    if (!isSessionLoading && user) {
      fetchFeedDetails();
    }
  }, [user, isSessionLoading, feedId, refreshKey]); // Rerun if user, loading state, feedId, or refreshKey changes

  // Handle refreshing the feed
  const handleRefreshFeed = async () => {
    if (isRefreshing) return; // Prevent multiple clicks

    setIsRefreshing(true);
    setError(null); // Clear previous errors
    try {
      const response = await fetch(`/api/feeds/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedId }),
      });

      const data = await response.json(); // Always try to parse response

      if (response.ok && data.success) {
        // Trigger a re-fetch of feed details and items by updating the key
        setRefreshKey((prevKey) => prevKey + 1);
        // Optionally show a success message
      } else {
        // Use error from API response if available, otherwise provide a default
        setError(data.error || "Failed to refresh feed. Please try again.");
      }
    } catch (error) {
      console.error("Error refreshing feed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while refreshing the feed.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Combined loading state check
  if (isSessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading Session...</div>
      </div>
    );
  }

  // If session check failed or no user, show error or redirect (handled by useEffect)
  if (!user) {
    // Render error message if set during session check, or null while redirecting
    return error ? (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-destructive text-center">{error}</div>
      </div>
    ) : null;
  }

  // Main content rendering
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b">
          {" "}
          {/* Added border */}
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4" // Adjusted margin
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="/dashboard"
                    className="flex items-center hover:text-foreground" // Added hover effect
                  >
                    <RssIcon className="mr-1.5 h-4 w-4" />{" "}
                    {/* Adjusted margin */}
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1 font-medium">
                    {" "}
                    {/* Made current page bolder */}
                    {isFeedLoading
                      ? "Loading feed..."
                      : feed
                        ? feed.Title
                        : "Feed"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-2 px-3">
            {" "}
            {/* Reduced gap */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              {/* Removed text for smaller screens or keep it concise */}
              {/* <span className="hidden sm:inline ml-1">Dashboard</span> */}
            </Button>
            <LogoutButton />
            {/* <NavActions /> Potentially remove if not needed here */}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          {" "}
          {/* Adjusted padding */}
          {/* Display error prominently if it exists */}
          {error && !isFeedLoading && (
            <Card className="border-destructive bg-destructive/10">
              <CardHeader>
                <CardTitle className="text-destructive text-base">
                  Error Loading Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}
          {/* Show loading skeleton for feed details */}
          {isFeedLoading && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-9 w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-muted-foreground mb-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
                {/* Optionally show skeleton for FeedItemList too */}
              </CardContent>
            </Card>
          )}
          {/* Show feed content only if not loading and no error */}
          {!isFeedLoading && feed && !error && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="flex items-center text-lg md:text-xl">
                    {" "}
                    {/* Adjusted size */}
                    <RssIcon className="mr-2 h-5 w-5 flex-shrink-0" />
                    {feed.Title}
                  </CardTitle>
                  {feed.Description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {" "}
                      {/* Limit description lines */}
                      {feed.Description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                    {" "}
                    {/* Smaller meta info */}
                    <div className="flex items-center gap-1">
                      <strong>URL:</strong>{" "}
                      <a
                        href={feed.FeedURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline truncate block max-w-xs sm:max-w-sm md:max-w-md" /* Truncate long URLs */
                        title={feed.FeedURL}
                      >
                        {feed.FeedURL}
                      </a>
                    </div>
                    <div>
                      <strong>Last Updated:</strong>{" "}
                      {feed.LastFetchedAt
                        ? new Date(feed.LastFetchedAt).toLocaleString()
                        : "Never"}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleRefreshFeed}
                  variant="outline"
                  size="sm"
                  disabled={isRefreshing}
                  className="mt-2 sm:mt-0 self-start sm:self-center" /* Adjust button positioning */
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {" "}
                {/* Removed top padding as header handles it */}
                <Separator className="mb-4" /> {/* Separator before items */}
                <FeedItemList
                  key={refreshKey} // Use key to force re-render on refresh
                  userId={user.id}
                  feedId={feedId}
                />
              </CardContent>
            </Card>
          )}
          {/* Case where feed is null after loading and no error (should ideally not happen if API is correct) */}
          {!isFeedLoading && !feed && !error && (
            <div className="text-center text-muted-foreground">
              Feed data could not be loaded.
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
