"use client";

import {
  ArrowUpRight,
  Link,
  MoreHorizontal,
  RssIcon,
  StarOff,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

interface FeedItem {
  FeedID: number;
  Title: string;
  Description?: string;
  FeedURL: string;
  LastFetchedAt?: string;
  ItemCount: number;
  UnreadCount: number;
}

export function NavFeeds({
  feeds,
  isLoading = false,
}: {
  feeds: FeedItem[];
  isLoading?: boolean;
}) {
  const { isMobile } = useSidebar();

  // Generate skeleton items for loading state
  const renderSkeletons = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <SidebarMenuItem key={`skeleton-${index}`}>
          <SidebarMenuButton>
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      ));
  };

  // Handle unsubscribe from feed
  const handleUnsubscribe = async (feedId: number) => {
    try {
      const response = await fetch("/api/feeds/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedId }),
      });

      if (response.ok) {
        // Refresh the feeds list
        window.location.reload();
      } else {
        console.error("Failed to unsubscribe from feed");
      }
    } catch (error) {
      console.error("Error unsubscribing from feed:", error);
    }
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>
        <RssIcon className="mr-1 h-4 w-4" />
        My Feeds
      </SidebarGroupLabel>
      <SidebarMenu>
        {isLoading ? (
          renderSkeletons()
        ) : feeds && feeds.length > 0 ? (
          feeds.map((feed) => (
            <SidebarMenuItem key={feed.FeedID}>
              <SidebarMenuButton asChild>
                <a href={`/feeds/${feed.FeedID}`} title={feed.Title}>
                  <RssIcon className="h-4 w-4" />
                  <span>{feed.Title}</span>
                </a>
              </SidebarMenuButton>
              {feed.UnreadCount > 0 && (
                <SidebarMenuBadge>
                  {feed.UnreadCount > 99 ? "99+" : feed.UnreadCount}
                </SidebarMenuBadge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem
                    onClick={() => handleUnsubscribe(feed.FeedID)}
                  >
                    <StarOff className="text-muted-foreground" />
                    <span>Unsubscribe</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link className="text-muted-foreground" />
                    <span>Copy Link</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => window.open(feed.FeedURL, "_blank")}
                  >
                    <ArrowUpRight className="text-muted-foreground" />
                    <span>Open Feed URL</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-muted-foreground text-xs">
                    {feed.ItemCount} items, last updated{" "}
                    {feed.LastFetchedAt
                      ? new Date(feed.LastFetchedAt).toLocaleString()
                      : "never"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))
        ) : (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              <span>No feeds yet</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
