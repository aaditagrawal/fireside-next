"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Force a reload to clear any client-side state
        router.push("/login");
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        console.error("Logout failed:", await response.text());
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={isLoading}
      className="text-muted-foreground hover:text-foreground"
    >
      {isLoading ? (
        "Logging out..."
      ) : (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </>
      )}
    </Button>
  );
}
