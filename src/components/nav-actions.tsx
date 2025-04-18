"use client"

import * as React from "react"
import { Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./theme-toggle"

export function NavActions() {
  return (
    <div className="flex items-center gap-2 text-sm">
      <ThemeToggle />
      <div className="text-muted-foreground hidden font-medium md:inline-block">
        Edit Oct 08
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7">
        <Star />
      </Button>
    </div>
  )
}
