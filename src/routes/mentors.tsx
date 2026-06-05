import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Avatar, ProgressBar, SectionTitle, Pill } from "@/components/primitives";
import { mentors, goalkeepers, interactions, formatRelative } from "@/lib/mock-data";

export const Route = createFileRoute("/mentors")({ component: MentorsPage });

function MentorsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="People & Mentors" description="RPM leadership, mentors, scouts and analysts." />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mentors.map((m) => {
          const gks = goalkeepers.filter((g) => g.mentorId === m.id);
          const recent = interactions.filter((i) => i.mentorId === m.id).slice(0, 3);
          const target = m.targetInteractions || 0;
          const pct = target > 0 ? Math.round((m.completedThisMonth / target) * 100) : 0;
          const fieldRole = m.role === "Goalkeeper Mentor" || m.role === "Goalkeeper Intelligence Scout" || m.role === "Director";
          return (
            <Card key={m.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <Avatar initials={m.initials} size={42} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.role}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{m.region} · {m.yearsExperience} yrs</div>
                </div>
                <Pill tone="info">{gks.length} GKs</Pill>
              </div>
              {target > 0 ? (
                <div>
                  <div className="flex justify-between text-[11px] mb-1.5"><span className="text-muted-foreground uppercase tracking-wider">Monthly Interactions</span><span className="tabular-nums font-medium">{m.completedThisMonth}/{target}</span></div>
                  <ProgressBar value={pct} tone={pct < 60 ? "warning" : "primary"} />
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground italic">{fieldRole ? "No monthly target set" : "Support staff — no observation target"}</div>
              )}
              <div>
                <SectionTitle>Assigned Goalkeepers</SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {gks.map((g) => (
                    <span key={g.id} className="text-[11px] px-1.5 py-0.5 rounded bg-accent/40 border border-border/60">{g.name}</span>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-2.5 mt-auto">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Recent</div>
                {recent.map((r) => (
                  <div key={r.id} className="flex justify-between text-xs py-0.5">
                    <span className="text-muted-foreground truncate">{r.type}</span>
                    <span className="tabular-nums text-muted-foreground">{formatRelative(r.date)}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
