"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Image,
  Flame,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Perfiles",
    href: "/dashboard/profiles",
    icon: Users,
  },
  {
    label: "Posts",
    href: "/dashboard/posts",
    icon: Image,
  },
  {
    label: "Trending",
    href: "/dashboard/trending",
    icon: Flame,
  },
  {
    label: "Urgentes",
    href: "/dashboard/urgent",
    icon: AlertTriangle,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-muted/40 p-6 hidden md:flex flex-col h-screen sticky top-0">
      <h2 className="text-lg font-semibold mb-6">Instagram Scraper</h2>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
