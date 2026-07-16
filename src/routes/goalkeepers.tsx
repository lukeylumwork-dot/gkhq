import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader, Card, TierBadge, Avatar, TrafficLight, DutyBadge, StatCard } from "@/components/primitives";
import { DataSourceBanner } from "@/lib/data-classification";
import { goalkeepers, getMentor, formatRelative, dutyStatusForGk, dutyOverview } from "@/lib/mock-data";
import { useState } from "react";
import { withPermission } from "@/components/require-permission";

export const Route = createFileRoute("/goalkeepers")({ component: withPermission(GoalkeepersLayout, "goalkeepers.view") });

function GoalkeepersLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isDetail = path !== "/goalkeepers";
  if (isDetail) return <Outlet />;
  return <GoalkeepersList />;
}

function GoalkeepersList() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [duty, setDuty] = useState<"all" | "green" | "amber" | "red">("all");
  const filtered = goalkeepers.filter((g) => {
    if (cat === "UK Based" && g.region !== "UK Based") return false;
    if (cat === "Overseas" && g.region !== "Overseas") return false;
    if (cat === "Free Agents" && g.status !== "Free Agent") return false;
    if (cat === "Prospects" && g.status !== "Prospect") return false;
    if (cat === "First Team Professionals" && g.status !== "First Team" && g.status !== "Elite") return false;
    if (duty !== "all" && dutyStatusForGk(g).level !== duty) return false;
    if (q && !`${g.name} ${g.club} ${g.nationality} ${g.league}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const CATS = ["All", "UK Based", "Overseas", "Prospects", "First Team Professionals", "Free Agents"] as const;
  const DUTIES: { id: typeof duty; label: string; count: number }[] = [
    { id: "all", label: "All", count: dutyOverview.total },
    { id: "green", label: "On Track", count: dutyOverview.green },
    { id: "amber", label: "Attention", count: dutyOverview.amber },
    { id: "red", label: "Breach", count: dutyOverview.red },
  ];
  return (
    <div className="space-y-5">
      <PageHeader title="Goalkeepers" description={`${goalkeepers.length} RPM clients under management across the UK and internationally.`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Under Care" value={dutyOverview.total} />
        <StatCard label="On Track · ≤21d" value={dutyOverview.green} hint="Duty fulfilled" />
        <StatCard label="Attention · 22–35d" value={dutyOverview.amber} hint="Contact required" accent="warning" />
        <StatCard label="Breach · 36d+" value={dutyOverview.red} hint="Immediate action" accent="destructive" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, club, league, nationality…" className="h-9 px-3 rounded-md bg-input/60 border border-border text-sm w-80" />
        <div className="flex flex-wrap rounded-md border border-border overflow-hidden text-xs">
          {CATS.map((t) => (
            <button key={t} onClick={() => setCat(t)} className={`px-3 py-1.5 transition-colors border-r border-border last:border-r-0 ${cat === t ? "bg-accent text-accent-foreground" : "hover:bg-accent/40 text-muted-foreground"}`}>{t}</button>
          ))}
        </div>
        <div className="flex flex-wrap rounded-md border border-border overflow-hidden text-xs">
          {DUTIES.map((d) => (
            <button key={d.id} onClick={() => setDuty(d.id)} className={`px-3 py-1.5 inline-flex items-center gap-1.5 transition-colors border-r border-border last:border-r-0 ${duty === d.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/40 text-muted-foreground"}`}>
              {d.id !== "all" && <TrafficLight level={d.id} size={7} />}
              {d.label}
              <span className="tabular-nums font-mono text-[10px] opacity-70">{d.count}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-muted-foreground tabular-nums font-mono">{filtered.length} results</div>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="font-medium px-3 py-2.5 w-6"></th>
              <th className="font-medium px-2 py-2.5">Goalkeeper</th>
              <th className="font-medium px-2 py-2.5">Status</th>
              <th className="font-medium px-2 py-2.5">Club</th>
              <th className="font-medium px-2 py-2.5">League</th>
              <th className="font-medium px-2 py-2.5">Age</th>
              <th className="font-medium px-2 py-2.5">Nationality</th>
              <th className="font-medium px-2 py-2.5">Mentor</th>
              <th className="font-medium px-2 py-2.5">Contract</th>
              <th className="font-medium px-2 py-2.5">Duty of Care</th>
              <th className="font-medium px-4 py-2.5 text-right">Rating</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((gk) => {
              const m = getMentor(gk.mentorId);
              const d = dutyStatusForGk(gk);
              return (
                <tr key={gk.id} className="border-b border-border/60 last:border-0 hover:bg-accent/20 transition-colors">
                  <td className="pl-4 pr-1"><TrafficLight level={d.level} /></td>
                  <td className="px-2 py-2.5">
                    <Link to="/goalkeepers/$gkId" params={{ gkId: gk.id }} className="flex items-center gap-2.5">
                      <Avatar initials={gk.initials} size={28} />
                      <span className="font-medium">{gk.name}</span>
                    </Link>
                  </td>
                  <td className="px-2"><TierBadge tier={gk.status} /></td>
                  <td className="px-2 text-muted-foreground">{gk.club}</td>
                  <td className="px-2 text-muted-foreground text-xs">{gk.league}</td>
                  <td className="px-2 tabular-nums font-mono">{gk.age}</td>
                  <td className="px-2 text-muted-foreground">{gk.nationality}</td>
                  <td className="px-2 text-muted-foreground">{m?.name}</td>
                  <td className="px-2 text-muted-foreground tabular-nums font-mono">{gk.contractUntil === "—" ? "—" : gk.contractUntil.slice(0, 4)}</td>
                  <td className="px-2">
                    <div className="flex items-center gap-2">
                      <DutyBadge level={d.level} label={d.label} />
                      <span className="text-[11px] text-muted-foreground tabular-nums font-mono">{formatRelative(gk.lastInteraction)}</span>
                    </div>
                  </td>
                  <td className="px-4 text-right tabular-nums font-mono font-medium">{gk.rating}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
