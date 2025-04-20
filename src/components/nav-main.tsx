"use client";

import { type LucideIcon } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
  }[];
}) {
  const pathname = usePathname();
  const [navItems, setNavItems] = useState(items);

  // Update active state based on current path
  useEffect(() => {
    setNavItems(
      items.map((item) => ({
        ...item,
        isActive:
          pathname === item.url ||
          (item.url !== "/dashboard" && pathname.startsWith(item.url)),
      })),
    );
  }, [pathname, items]);

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={item.isActive}>
            <a href={item.url}>
              <item.icon />
              <span>{item.title}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
