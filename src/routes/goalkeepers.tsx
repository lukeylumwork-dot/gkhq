import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader, Card, TierBadge, Avatar, Pill } from "@/components/primitives";
import { goalkeepers, getMentor, formatRelative } from "@/lib/mock-data";
import { useState } from "react";

export const Route = createFileRoute("/goalkeepers")({ component: GoalkeepersLayout });

function GoalkeepersLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isDetail = path !== "/goalkeepers";
  if (isDetail) return <Outlet />;
  return <GoalkeepersList />;
}

function GoalkeepersList() {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<string>("all");
  const filtered = goalkeepers.filter((g) => {
    if (tier !== "all" && g.tier !== tier) return false;
    if (q && !`${g.name} ${g.club} ${g.nationality}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <div className="space-y-5">
      <PageHeader title="Goalkeepers" description={`${goalkeepers.length} goalkeepers under management across all tiers.`} />
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, club, nationality…" className="h-9 px-3 rounded-md bg-input/60 border border-border text-sm w-72" />
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          {(["all", "Tier 1", "Tier 2", "Tier 3"] as const).map((t) => (
            <button key={t} onClick={() => setTier(t)} className={`px-3 py-1.5 transition-colors ${tier === t ? "bg-accent text-accent-foreground" : "hover:bg-accent/40 text-muted-foreground"}`}>{t === "all" ? "All" : t}</button>
          ))}
        </div>
        <div className="ml-auto text-xs text-muted-foreground tabular-nums">{filtered.length} results</div>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="font-medium px-4 py-2.5">Goalkeeper</th>
              <th className="font-medium px-2 py-2.5">Tier</th>
              <th className="font-medium px-2 py-2.5">Club</th>
              <th className="font-medium px-2 py-2.5">Age</th>
              <th className="font-medium px-2 py-2.5">Nationality</th>
              <th className="font-medium px-2 py-2.5">Mentor</th>
              <th className="font-medium px-2 py-2.5">Contract</th>
              <th className="font-medium px-2 py-2.5">Last</th>
              <th className="font-medium px-2 py-2.5">Next</th>
              <th className="font-medium px-4 py-2.5 text-right">Rating</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((gk) => {
              const m = getMentor(gk.mentorId);
              const overdue = (Date.now() - +new Date(gk.lastInteraction)) / 86400000 > 30;
              return (
                <tr key={gk.id} className="border-b border-border/60 last:border-0 hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link to="/goalkeepers/$gkId" params={{ gkId: gk.id }} className="flex items-center gap-2.5">
                      <Avatar initials={gk.initials} size={28} />
                      <span className="font-medium">{gk.name}</span>
                    </Link>
                  </td>
                  <td className="px-2"><TierBadge tier={gk.tier} /></td>
                  <td className="px-2 text-muted-foreground">{gk.club}</td>
                  <td className="px-2 tabular-nums">{gk.age}</td>
                  <td className="px-2 text-muted-foreground">{gk.nationality}</td>
                  <td className="px-2 text-muted-foreground">{m?.name}</td>
                  <td className="px-2 text-muted-foreground tabular-nums">{gk.contractUntil.slice(0, 4)}</td>
                  <td className="px-2"><Pill tone={overdue ? "destructive" : "muted"}>{formatRelative(gk.lastInteraction)}</Pill></td>
                  <td className="px-2 text-muted-foreground">{formatRelative(gk.nextInteraction)}</td>
                  <td className="px-4 text-right tabular-nums font-medium">{gk.rating}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
