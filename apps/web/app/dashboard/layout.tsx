"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/profiles", label: "Perfiles", icon: Users },
  { href: "/dashboard/posts", label: "Posts", icon: FileText },
  { href: "/dashboard/trending", label: "Trending", icon: TrendingUp },
  { href: "/dashboard/urgent", label: "Urgentes", icon: AlertCircle },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-orange-500 text-white shadow-md shadow-rose-500/30">
        <Sparkles className="h-4 w-4" />
        <span className="absolute inset-0 rounded-xl bg-white/10 mix-blend-overlay" />
      </div>
      <div className="leading-tight">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Travel AI
        </p>
        <p className="text-sm font-semibold text-gradient-brand">
          Scraper Panel
        </p>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "text-slate-900"
          : "text-slate-500 hover:bg-slate-100/70 hover:text-slate-900"
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-0 rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80"
          transition={{ type: "spring", stiffness: 360, damping: 32 }}
        />
      )}
      <span className="relative flex items-center gap-3">
        <Icon
          className={cn(
            "h-4 w-4 transition-colors",
            active ? "text-rose-500" : "text-slate-400 group-hover:text-slate-700"
          )}
        />
        {label}
      </span>
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-slate-200/60 bg-white/60 px-4 py-6 backdrop-blur-xl md:flex">
        <div className="px-2">
          <Brand />
        </div>
        <nav className="mt-8 flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href}
            />
          ))}
        </nav>
        <div className="rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-3 text-[11px] leading-relaxed text-slate-500">
          <p className="font-semibold text-slate-700">Tip</p>
          <p className="mt-0.5">
            Agregá perfiles desde la pestaña{" "}
            <span className="font-medium text-slate-700">Perfiles</span> para
            empezar a recolectar posts.
          </p>
        </div>
      </aside>

      {/* Main + Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/60 bg-white/70 px-4 backdrop-blur-xl md:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Brand />
          <span className="w-9" />
        </header>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 md:hidden"
            >
              <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 280, damping: 32 }}
                className="absolute left-0 top-0 h-full w-72 border-r border-slate-200/60 bg-white p-4 shadow-2xl"
              >
                <div className="mb-6 flex items-center justify-between">
                  <Brand />
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={pathname === item.href}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}
                </nav>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 p-4 md:p-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
