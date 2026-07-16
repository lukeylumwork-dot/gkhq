import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Pill, Avatar } from "@/components/primitives";
import { DataSourceBanner } from "@/lib/data-classification";
import { interactions, getGk, getMentor, formatDate, formatRelative } from "@/lib/mock-data";
import { useState } from "react";
import { withPermission } from "@/components/require-permission";

export const Route = createFileRoute("/interactions")({ component: withPermission(InteractionsPage, "interactions.view") });

const TYPES = ["All", "Live Match Observation", "Training Ground Visit", "Face to Face", "Video Review Session", "Phone Call", "WhatsApp Feedback", "Development Meeting", "Scouting Assignment"] as const;

function InteractionsPage() {
  const [type, setType] = useState<(typeof TYPES)[number]>("All");
  const sorted = [...interactions].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const filtered = type === "All" ? sorted : sorted.filter((i) => i.type === type);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Interaction Tracking"
        description="Every logged touchpoint between mentors and goalkeepers."
        action={<button className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Log Interaction</button>}
      />
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)} className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${type === t ? "bg-accent border-accent text-accent-foreground" : "border-border hover:bg-accent/40 text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-2 py-2.5 font-medium">Type</th>
              <th className="px-2 py-2.5 font-medium">Goalkeeper</th>
              <th className="px-2 py-2.5 font-medium">Mentor</th>
              <th className="px-2 py-2.5 font-medium">Notes</th>
              <th className="px-2 py-2.5 font-medium">Outcome</th>
              <th className="px-4 py-2.5 font-medium">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 80).map((i) => {
              const gk = getGk(i.gkId);
              const m = getMentor(i.mentorId);
              return (
                <tr key={i.id} className="border-b border-border/60 last:border-0 hover:bg-accent/20">
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums font-mono">{formatDate(i.date)}<div className="text-[10px] opacity-60">{formatRelative(i.date)}</div></td>
                  <td className="px-2"><Pill tone="info">{i.type}</Pill></td>
                  <td className="px-2"><div className="flex items-center gap-2"><Avatar initials={gk?.initials ?? "?"} size={22} /><span className="font-medium">{gk?.name}</span></div></td>
                  <td className="px-2 text-muted-foreground">{m?.name}</td>
                  <td className="px-2 text-muted-foreground max-w-md"><span className="line-clamp-1">{i.notes}</span></td>
                  <td className="px-2"><Pill>{i.outcome}</Pill></td>
                  <td className="px-4 text-muted-foreground"><span className="line-clamp-1">{i.followUp}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
