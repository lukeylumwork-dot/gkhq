import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tier } from "@/lib/mock-data";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
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
      <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}

export function TierBadge({ tier }: { tier: Tier }) {
  const styles: Record<Tier, string> = {
    "Tier 1": "bg-tier-1/15 text-tier-1 border-tier-1/30",
    "Tier 2": "bg-tier-2/15 text-tier-2 border-tier-2/30",
    "Tier 3": "bg-tier-3/15 text-tier-3 border-tier-3/30",
  };
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border tabular-nums", styles[tier])}>
      {tier}
    </span>
  );
}

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
