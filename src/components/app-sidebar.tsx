"use client";

import * as React from "react";
import {
  RssIcon,
  Home,
  Newspaper,
  Search,
  Settings2,
  Sparkles,
  Tag,
} from "lucide-react";

import { NavFeeds } from "@/components/nav-feeds";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavCategories } from "@/components/nav-categories";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useEffect, useState } from "react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [feeds, setFeeds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's subscribed feeds
  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/feeds/subscriptions");

        if (!response.ok) {
          throw new Error(
            `Failed to fetch subscriptions: ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (data.success && data.subscriptions) {
          setFeeds(data.subscriptions);
        } else {
          setError(data.error || "Failed to load subscriptions");
        }
      } catch (error) {
        console.error("Error fetching feeds:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeeds();
  }, []);

  // Data for sidebar navigation
  const data = {
    teams: [
      {
        name: "Fireside RSS",
        logo: RssIcon,
        plan: "Personal",
      },
    ],
    navMain: [
      {
        title: "Home",
        url: "/dashboard",
        icon: Home,
      },
      {
        title: "All Articles",
        url: "/articles",
        icon: Newspaper,
      },
      {
        title: "Search",
        url: "/search",
        icon: Search,
      },
      {
        title: "Discover",
        url: "/discover", // Make sure this exists
        icon: Sparkles,
      },
    ],
    navSecondary: [
      {
        title: "Manual Entry",
        url: "/manual",
        icon: Tag,
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings2,
      },
    ],
    categories: [
      {
        name: "Technology",
        emoji: "💻",
      },
      {
        name: "Science",
        emoji: "🔬",
      },
      {
        name: "News",
        emoji: "📰",
      },
      {
        name: "Entertainment",
        emoji: "🎭",
      },
    ],
  };

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavFeeds feeds={feeds} isLoading={isLoading} />
        <NavCategories categories={data.categories} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
