"use client"

import * as React from "react"
import { Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./theme-toggle"

export function NavActions() {
  // Show current date instead of static label
  const todayStr = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  return (
    <div className="flex items-center gap-2 text-sm">
      <ThemeToggle />
      <div className="text-muted-foreground hidden font-medium md:inline-block">
        {todayStr}
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7">
        <Star />
      </Button>
    </div>
  )
}
