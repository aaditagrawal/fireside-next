"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle } from "lucide-react";

export function FeedDebugger() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    feed?: any;
    error?: string;
  } | null>(null);

  const handleDebug = async () => {
    if (!url) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/feeds/debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">RSS Feed Debugger</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter RSS Feed URL to debug"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleDebug} disabled={isLoading || !url}>
              {isLoading ? "Testing..." : "Test Feed"}
            </Button>
          </div>

          {result && (
            <div className="p-4 rounded-md border">
              {result.success ? (
                <div className="space-y-2">
                  <div className="flex items-center text-green-600 dark:text-green-400 font-medium gap-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Feed parsed successfully!</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Title:</strong> {result.feed.title}
                    </p>
                    <p>
                      <strong>Item Count:</strong> {result.feed.itemCount}
                    </p>
                    <p>
                      <strong>Link:</strong> {result.feed.link}
                    </p>
                    {result.feed.description && (
                      <p>
                        <strong>Description:</strong> {result.feed.description}
                      </p>
                    )}
                    {result.feed.sample && result.feed.sample.length > 0 && (
                      <>
                        <p className="font-medium mt-2">Sample items:</p>
                        <ul className="space-y-2 pl-4">
                          {result.feed.sample.map((item: any, i: number) => (
                            <li
                              key={i}
                              className="border-l-2 pl-2 border-gray-300"
                            >
                              <p className="font-medium">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.pubDate}
                              </p>
                              {item.author && (
                                <p className="text-xs">Author: {item.author}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start text-destructive gap-2">
                  <AlertTriangle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Feed parsing failed</p>
                    <p className="text-sm">{result.error}</p>
                    <p className="text-sm mt-2">
                      Try checking the URL for typos or if the feed format is
                      non-standard.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
