"use client";

import { useEffect } from "react";
import { LucideIcon } from "lucide-react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  loading?: boolean;
  /** índice para stagger animation */
  index?: number;
  /** color del acento (gradient from). default sky */
  accent?: "sky" | "violet" | "emerald" | "amber" | "rose";
}

const accents: Record<NonNullable<StatsCardProps["accent"]>, string> = {
  sky: "from-sky-500/80 to-blue-600",
  violet: "from-violet-500/80 to-fuchsia-600",
  emerald: "from-emerald-500/80 to-teal-600",
  amber: "from-amber-500/80 to-orange-600",
  rose: "from-rose-500/80 to-red-600",
};

const accentRings: Record<NonNullable<StatsCardProps["accent"]>, string> = {
  sky: "ring-sky-200/70 group-hover:ring-sky-300",
  violet: "ring-violet-200/70 group-hover:ring-violet-300",
  emerald: "ring-emerald-200/70 group-hover:ring-emerald-300",
  amber: "ring-amber-200/70 group-hover:ring-amber-300",
  rose: "ring-rose-200/70 group-hover:ring-rose-300",
};

function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [value, motionVal]);

  return <motion.span>{rounded}</motion.span>;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
  index = 0,
  accent = "sky",
}: StatsCardProps) {
  const isNumber = typeof value === "number";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.07,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-300 hover:shadow-[0_18px_50px_-18px_rgba(15,23,42,0.25)]"
    >
      {/* Decorative blob */}
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${accents[accent]} opacity-[0.07] blur-2xl transition-opacity duration-500 group-hover:opacity-[0.14]`}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${accents[accent]} text-white shadow-sm ring-2 ${accentRings[accent]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : isNumber ? (
          <AnimatedNumber value={value as number} />
        ) : (
          <span>{value}</span>
        )}
      </div>

      {trend && !loading && (
        <p
          className={`mt-1 text-xs font-medium ${
            trend.value >= 0 ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {trend.value > 0 ? "+" : ""}
          {trend.value}% {trend.label}
        </p>
      )}
    </motion.div>
  );
}
