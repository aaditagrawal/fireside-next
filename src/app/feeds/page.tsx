"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddFeedForm } from "@/components/add-feed-form";
import { Button } from "@/components/ui/button";

interface FeedItem {
  FeedID: number;
  Title: string;
  FeedURL: string;
}

export default function FeedsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        if (data.user?.id) {
          setUserId(data.user.id);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setSessionLoading(false);
      }
    };
    checkSession();
  }, [router]);

  // Fetch subscriptions
  useEffect(() => {
    if (userId == null) return;
    const fetchSubs = async () => {
      try {
        setLoadingFeeds(true);
        const res = await fetch("/api/feeds/subscriptions");
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        if (data.success) {
          setFeeds(data.subscriptions || []);
        } else {
          setError(data.error || "Failed to load subscriptions");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoadingFeeds(false);
      }
    };
    fetchSubs();
  }, [userId]);

  const handleUnsubscribe = async (feedId: number) => {
    try {
      const res = await fetch("/api/feeds/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedId }),
      });
      if (res.ok) {
        setFeeds((prev) => prev.filter((f) => f.FeedID !== feedId));
      }
    } catch (err) {
      console.error("Unsubscribe error:", err);
    }
  };

  const handleAdded = () => {
    // Refresh list after add
    if (userId != null) {
      (async () => {
        try {
          setLoadingFeeds(true);
          const res = await fetch("/api/feeds/subscriptions");
          if (res.ok) {
            const data = await res.json();
            if (data.success) setFeeds(data.subscriptions || []);
          }
        } catch {}
        finally { setLoadingFeeds(false); }
      })();
    }
  };

  if (sessionLoading) return <div>Loading session...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Manage Feeds</h1>
      <AddFeedForm userId={userId || undefined} onFeedAdded={handleAdded} />
      {error && <div className="text-red-600">{error}</div>}
      {loadingFeeds ? (
        <div>Loading your feeds...</div>
      ) : feeds.length > 0 ? (
        <ul className="space-y-2">
          {feeds.map((feed) => (
            <li
              key={feed.FeedID}
              className="flex items-center justify-between border p-2 rounded"
            >
              <a
                href={`/feeds/${feed.FeedID}`}
                className="text-blue-600 hover:underline"
              >
                {feed.Title}
              </a>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleUnsubscribe(feed.FeedID)}
              >
                Unsubscribe
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div>You have no subscribed feeds.</div>
      )}
    </div>
  );
}
