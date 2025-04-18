"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { NavActions } from "@/components/nav-actions";
import { AddFeedForm } from "@/components/add-feed-form";
import { FeedItemList } from "@/components/feed-item-list";
import { LogoutButton } from "@/components/logout-button";
import { FeedDebugger } from "@/components/feed-debugger";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: number;
    name: string;
    email: string;
    role?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshFeeds, setRefreshFeeds] = useState(0);

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
        console.log("Session check response:", data);

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

  // Handle feed added
  const handleFeedAdded = () => {
    setRefreshFeeds((prev) => prev + 1);
  };

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
        <header className="flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    RSS Feed Dashboard
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main content area */}
            <div className="md:col-span-2 space-y-6">
              <FeedItemList
                userId={user.id}
                key={`feed-list-${refreshFeeds}`}
              />
            </div>

            {/* Sidebar content */}
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <AddFeedForm userId={user.id} onFeedAdded={handleFeedAdded} />
                </CardContent>
              </Card>

              {/* Add the debugger component */}
              <FeedDebugger />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Add any RSS or Atom feed by URL</li>
                    <li>• Articles are automatically refreshed</li>
                    <li>
                      • Click on an article title to read the full content
                    </li>
                    <li>• Use the sidebar to navigate between feeds</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
