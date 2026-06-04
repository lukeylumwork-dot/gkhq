import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, PageHeader, StatCard, SectionTitle, Avatar, Pill, TierBadge } from "@/components/primitives";
import { activity, alerts, goalkeepers, stats, formatRelative, getMentor } from "@/lib/mock-data";
import { ArrowUpRight, AlertTriangle, CalendarClock, FileText, Users, UserCog } from "lucide-react";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const upcoming = [...goalkeepers]
    .filter((g) => new Date(g.nextInteraction).getTime() >= Date.now())
    .sort((a, b) => +new Date(a.nextInteraction) - +new Date(b.nextInteraction))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader title="Operations Dashboard" description="Live overview of goalkeeper coverage, mentor activity, and outstanding actions." />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Goalkeepers" value={stats.totalGks} hint="Across all tiers" />
        <StatCard label="Upcoming Interactions" value={stats.upcomingInteractions} hint="Next 14 days" accent="info" />
        <StatCard label="Overdue Interactions" value={stats.overdueInteractions} hint="Action required" accent="destructive" />
        <StatCard label="Reports This Week" value={stats.reportsThisWeek} hint="Submitted" accent="primary" />
        <StatCard label="Active Mentors" value={stats.activeMentors} hint="In rotation" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4">
          <SectionTitle action={<Link to="/calendar" className="text-xs text-primary inline-flex items-center gap-1">Open calendar <ArrowUpRight className="size-3" /></Link>}>
            Upcoming Interactions
          </SectionTitle>
          <div className="divide-y divide-border">
            {upcoming.map((gk) => {
              const m = getMentor(gk.mentorId);
              return (
                <Link key={gk.id} to="/goalkeepers/$gkId" params={{ gkId: gk.id }} className="flex items-center gap-3 py-2.5 hover:bg-accent/30 -mx-2 px-2 rounded-md transition-colors">
                  <Avatar initials={gk.initials} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{gk.name}</span>
                      <TierBadge tier={gk.tier} />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{gk.club} · {gk.league}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium tabular-nums flex items-center gap-1 justify-end"><CalendarClock className="size-3 text-muted-foreground" />{formatRelative(gk.nextInteraction)}</div>
                    <div className="text-[11px] text-muted-foreground">w/ {m?.name.split(" ")[1]}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle action={<Link to="/alerts" className="text-xs text-primary inline-flex items-center gap-1">All alerts <ArrowUpRight className="size-3" /></Link>}>
            Alerts Requiring Attention
          </SectionTitle>
          <div className="space-y-2">
            {alerts.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-start gap-2 p-2 rounded-md bg-accent/30 border border-border/50">
                <AlertTriangle className={`size-3.5 mt-0.5 shrink-0 ${a.severity === "high" ? "text-destructive" : a.severity === "medium" ? "text-warning" : "text-info"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{a.message}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Pill tone={a.severity === "high" ? "destructive" : a.severity === "medium" ? "warning" : "info"}>{a.kind}</Pill>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4">
          <SectionTitle>Recent Activity</SectionTitle>
          <div className="space-y-2">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-1.5">
                <Avatar initials={a.actorInitials} size={26} />
                <div className="flex-1 min-w-0 text-sm">
                  <span className="font-medium">{a.actor}</span>{" "}
                  <span className="text-muted-foreground">{a.action}</span>{" "}
                  <span className="font-medium">{a.target}</span>
                  <div className="text-[11px] text-muted-foreground">{formatRelative(a.date)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle>Tier Distribution</SectionTitle>
          <div className="space-y-3">
            {stats.tierDistribution.map((t) => {
              const pct = Math.round((t.count / stats.totalGks) * 100);
              return (
                <div key={t.tier}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-2"><TierBadge tier={t.tier as never} /> <span className="text-muted-foreground">{t.count} GKs</span></span>
                    <span className="tabular-nums font-medium">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${t.tier === "Tier 1" ? "bg-tier-1" : t.tier === "Tier 2" ? "bg-tier-2" : "bg-tier-3"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-border">
            <Link to="/goalkeepers" className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-accent/40"><Users className="size-4 text-primary" /><span className="text-[11px]">Goalkeepers</span></Link>
            <Link to="/mentors" className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-accent/40"><UserCog className="size-4 text-info" /><span className="text-[11px]">Mentors</span></Link>
            <Link to="/reports" className="flex flex-col items-center gap-1 p-2 rounded-md hover:bg-accent/40"><FileText className="size-4 text-warning" /><span className="text-[11px]">Reports</span></Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
