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
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper } from "lucide-react";

export default function AllArticlesPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    id: number;
    name: string;
    email: string;
    role?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
                    <Newspaper className="mr-2 h-4 w-4" />
                    All Articles
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
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Articles</CardTitle>
              </CardHeader>
              <CardContent>
                <FeedItemList userId={user.id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
