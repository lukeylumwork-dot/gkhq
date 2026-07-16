import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Card, TierBadge, Pill, Avatar, ProgressBar } from "@/components/primitives";
import { DataSourceBanner } from "@/lib/data-classification";
import { goalkeepers, reports } from "@/lib/mock-data";
import { useState } from "react";
import { Video } from "lucide-react";
import { withPermission } from "@/components/require-permission";

export const Route = createFileRoute("/intelligence")({ component: withPermission(IntelligencePage, "intelligence.view") });

function IntelligencePage() {
  const [q, setQ] = useState("");
  const [rec, setRec] = useState<string>("all");
  const filtered = goalkeepers.filter((g) => {
    if (rec !== "all" && g.recommendation !== rec) return false;
    if (q && !`${g.name} ${g.club} ${g.league} ${g.nationality}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.rating - a.rating);

  return (
    <div className="space-y-5">
      <PageHeader title="Goalkeeper Intelligence" description="Searchable database of every scouted and tracked goalkeeper." />

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, club, league, nationality…" className="h-9 px-3 rounded-md bg-input/60 border border-border text-sm w-80" />
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          {(["all", "Sign", "Monitor", "Loan", "Pass"] as const).map((r) => (
            <button key={r} onClick={() => setRec(r)} className={`px-3 py-1.5 ${rec === r ? "bg-accent text-accent-foreground" : "hover:bg-accent/40 text-muted-foreground"}`}>{r === "all" ? "All" : r}</button>
          ))}
        </div>
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length} results</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((gk) => {
          const reportCount = reports.filter((r) => r.gkId === gk.id).length;
          return (
            <Link to="/goalkeepers/$gkId" params={{ gkId: gk.id }} key={gk.id} className="block group">
              <Card className="p-4 hover:bg-accent/20 transition-colors h-full">
                <div className="flex items-start gap-3">
                  <Avatar initials={gk.initials} size={42} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="font-semibold truncate">{gk.name}</span><TierBadge tier={gk.tier} /></div>
                    <div className="text-xs text-muted-foreground truncate">{gk.club} · {gk.league}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{gk.nationality} · {gk.age} yrs · {gk.height}</div>
                  </div>
                  <Pill tone={gk.recommendation === "Sign" ? "success" : gk.recommendation === "Pass" ? "destructive" : "info"}>{gk.recommendation}</Pill>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1"><span className="text-muted-foreground">Rating</span><span className="tabular-nums font-mono font-medium">{gk.rating}</span></div>
                    <ProgressBar value={gk.rating} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1"><span className="text-muted-foreground">Potential</span><span className="tabular-nums font-mono font-medium">{gk.potential}</span></div>
                    <ProgressBar value={gk.potential} tone="info" />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60 text-[11px] text-muted-foreground">
                  <span>{reportCount} reports</span>
                  <span className="inline-flex items-center gap-1"><Video className="size-3" />{gk.videoLinks.length} videos</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
