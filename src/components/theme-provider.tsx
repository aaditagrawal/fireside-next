"use client";

import { ReactNode, useEffect } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    // Initialize theme from localStorage or system preference
    let theme: "light" | "dark" = "light";
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      theme = stored;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    }
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, []);

  return <>{children}</>;
}
