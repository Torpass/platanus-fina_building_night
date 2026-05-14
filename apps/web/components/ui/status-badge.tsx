import { Badge } from "./badge";

type Status =
  | "pending"
  | "scraping"
  | "analyzing"
  | "completed"
  | "error"
  | "queued"
  | "running"
  | "failed";

interface StatusBadgeProps {
  status: Status | string;
}

const statusConfig: Record<string, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  pending: { label: "Pendiente", variant: "muted" },
  scraping: { label: "Scrapeando", variant: "warning" },
  analyzing: { label: "Analizando", variant: "info" },
  completed: { label: "Completado", variant: "success" },
  error: { label: "Error", variant: "destructive" },
  queued: { label: "En cola", variant: "muted" },
  running: { label: "En ejecución", variant: "warning" },
  failed: { label: "Fallido", variant: "destructive" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: "outline" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
