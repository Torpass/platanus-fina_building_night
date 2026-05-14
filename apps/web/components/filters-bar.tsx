"use client";

import { useState, useCallback } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PostsFilters } from "@/lib/types";

interface FiltersBarProps {
  onFilterChange: (filters: PostsFilters) => void;
  destinations: string[];
  showSort?: boolean;
  showDateRange?: boolean;
}

const experienceTypes = [
  { value: "all", label: "Todos los tipos" },
  { value: "playa", label: "Playa" },
  { value: "montaña", label: "Montaña" },
  { value: "gastronomía", label: "Gastronomía" },
  { value: "aventura", label: "Aventura" },
  { value: "cultural", label: "Cultural" },
  { value: "relax", label: "Relax" },
  { value: "otro", label: "Otro" },
];

const urgencyLevels = [
  { value: "all", label: "Todas las urgencias" },
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
];

const sortOptions = [
  { value: "date", label: "Fecha" },
  { value: "engagement", label: "Engagement" },
  { value: "likes", label: "Likes" },
];

export function FiltersBar({
  onFilterChange,
  destinations,
  showSort = false,
  showDateRange = false,
}: FiltersBarProps) {
  const [filters, setFilters] = useState<PostsFilters>({
    search: "",
    destination: "",
    experience_type: "",
    urgency_level: "",
    sort_by: "date",
  });

  const updateFilter = useCallback(
    (key: keyof PostsFilters, value: string) => {
      const finalValue = value === "all" ? "" : value;
      const newFilters = { ...filters, [key]: finalValue };
      setFilters(newFilters);
      onFilterChange(newFilters);
    },
    [filters, onFilterChange]
  );

  const clearFilters = useCallback(() => {
    const empty: PostsFilters = {
      search: "",
      destination: "",
      experience_type: "",
      urgency_level: "",
      sort_by: "date",
    };
    setFilters(empty);
    onFilterChange(empty);
  }, [onFilterChange]);

  const hasActiveFilters =
    filters.search ||
    filters.destination ||
    filters.experience_type ||
    filters.urgency_level;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por caption o destino..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.experience_type || "all"}
          onValueChange={(value) => updateFilter("experience_type", value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo de experiencia" />
          </SelectTrigger>
          <SelectContent>
            {experienceTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.destination || "all"}
          onValueChange={(value) => updateFilter("destination", value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Destino" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los destinos</SelectItem>
            {destinations.map((dest) => (
              <SelectItem key={dest} value={dest}>
                {dest}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.urgency_level || "all"}
          onValueChange={(value) => updateFilter("urgency_level", value)}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Urgencia" />
          </SelectTrigger>
          <SelectContent>
            {urgencyLevels.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showSort && (
          <Select
            value={filters.sort_by}
            onValueChange={(value) =>
              updateFilter("sort_by", value as "date" | "engagement" | "likes")
            }
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {showDateRange && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Desde:</span>
            <Input
              type="date"
              value={filters.date_from || ""}
              onChange={(e) => updateFilter("date_from", e.target.value)}
              className="w-full sm:w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Hasta:</span>
            <Input
              type="date"
              value={filters.date_to || ""}
              onChange={(e) => updateFilter("date_to", e.target.value)}
              className="w-full sm:w-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
