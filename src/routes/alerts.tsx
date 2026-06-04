import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, Pill, StatCard } from "@/components/primitives";
import { alerts, getGk, formatRelative } from "@/lib/mock-data";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/alerts")({ component: AlertsPage });

function AlertsPage() {
  const high = alerts.filter((a) => a.severity === "high").length;
  const med = alerts.filter((a) => a.severity === "medium").length;
  const low = alerts.filter((a) => a.severity === "low").length;

  const groups = ["Overdue observation", "Overdue contact", "Missing report", "Upcoming match", "Expiring action"] as const;

  return (
    <div className="space-y-5">
      <PageHeader title="Alerts Engine" description="Conditions across the platform that need attention." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Alerts" value={alerts.length} />
        <StatCard label="High" value={high} accent="destructive" />
        <StatCard label="Medium" value={med} accent="warning" />
        <StatCard label="Low" value={low} accent="info" />
      </div>

      <div className="space-y-5">
        {groups.map((g) => {
          const list = alerts.filter((a) => a.kind === g);
          if (!list.length) return null;
          return (
            <Card key={g} className="p-4">
              <div className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">{g} <span className="text-foreground/60">({list.length})</span></div>
              <div className="divide-y divide-border">
                {list.map((a) => {
                  const gk = a.gkId ? getGk(a.gkId) : undefined;
                  return (
                    <div key={a.id} className="flex items-center gap-3 py-2.5">
                      <AlertTriangle className={`size-4 ${a.severity === "high" ? "text-destructive" : a.severity === "medium" ? "text-warning" : "text-info"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{a.message}</div>
                        <div className="text-[11px] text-muted-foreground">{formatRelative(a.date)}</div>
                      </div>
                      <Pill tone={a.severity === "high" ? "destructive" : a.severity === "medium" ? "warning" : "info"}>{a.severity}</Pill>
                      {gk && <Link to="/goalkeepers/$gkId" params={{ gkId: gk.id }} className="text-xs text-primary">Open →</Link>}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
