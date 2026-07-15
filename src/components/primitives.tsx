import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tier, DutyLevel } from "@/lib/mock-data";

export function TrafficLight({ level, size = 10 }: { level: DutyLevel; size?: number }) {
  const tone =
    level === "green" ? "bg-success"
    : level === "amber" ? "bg-warning"
    : "bg-destructive animate-pulse";
  return <span className={cn("inline-block rounded-full shrink-0 ring-2 ring-background", tone)} style={{ width: size, height: size }} aria-label={`duty ${level}`} />;
}

export function DutyBadge({ level, label }: { level: DutyLevel; label: string }) {
  const tone =
    level === "green" ? "bg-success/15 text-success border-success/30"
    : level === "amber" ? "bg-warning/15 text-warning border-warning/30"
    : "bg-destructive/15 text-destructive border-destructive/40";
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap", tone)}>
      <TrafficLight level={level} size={6} />
      {label}
    </span>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-3xl font-display font-bold uppercase tracking-[0.02em]">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card text-card-foreground", className)}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: "primary" | "warning" | "destructive" | "info" }) {
  const ring =
    accent === "warning" ? "before:bg-warning"
    : accent === "destructive" ? "before:bg-destructive"
    : accent === "info" ? "before:bg-info"
    : "before:bg-primary";
  return (
    <Card className={cn("p-4 relative overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-[3px]", ring)}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums font-mono">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}

export function TierBadge({ tier }: { tier: Tier }) {
  const styles: Record<Tier, string> = {
    "Elite": "bg-warning/15 text-warning border-warning/40",
    "First Team": "bg-info/15 text-info border-info/30",
    "Development": "bg-primary/15 text-primary border-primary/30",
    "Prospect": "bg-tier-3/20 text-tier-3 border-tier-3/40",
    "Free Agent": "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap", styles[tier])}>
      {tier}
    </span>
  );
}
export const StatusBadge = TierBadge;

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "success" | "warning" | "destructive" | "info" }) {
  const t: Record<string, string> = {
    muted: "bg-muted text-muted-foreground border-border",
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    destructive: "bg-destructive/15 text-destructive border-destructive/40",
    info: "bg-info/15 text-info border-info/30",
  };
  return <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border", t[tone])}>{children}</span>;
}

export function Avatar({ initials, size = 28 }: { initials: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-accent text-accent-foreground grid place-items-center font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">{children}</h2>
      {action}
    </div>
  );
}

export function ProgressBar({ value, tone = "primary" }: { value: number; tone?: "primary" | "warning" | "info" }) {
  const c = tone === "warning" ? "bg-warning" : tone === "info" ? "bg-info" : "bg-primary";
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full", c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
