import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader, Card, TierBadge, Avatar, Pill, SectionTitle, ProgressBar } from "@/components/primitives";
import { DataSourceBanner } from "@/lib/data-classification";
import { goalkeepers, interactions, reports, media, getMentor, formatDate, formatRelative } from "@/lib/mock-data";
import { ArrowLeft, Video, FileText, Phone, MessageSquare, Eye, Users as UsersIcon } from "lucide-react";

export const Route = createFileRoute("/goalkeepers/$gkId")({
  loader: ({ params }) => {
    const gk = goalkeepers.find((g) => g.id === params.gkId);
    if (!gk) throw notFound();
    return { gk };
  },
  component: GkDetail,
  notFoundComponent: () => <div className="p-8 text-sm text-muted-foreground">Goalkeeper not found.</div>,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
});

const TYPE_ICON: Record<string, typeof Video> = {
  "Live Match Observation": Eye, "Training Ground Visit": UsersIcon,
  "Face to Face": UsersIcon, "Phone Call": Phone,
};

function GkDetail() {
  const { gk } = Route.useLoaderData();
  const mentor = getMentor(gk.mentorId);
  const gkInteractions = interactions.filter((i) => i.gkId === gk.id).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const gkReports = reports.filter((r) => r.gkId === gk.id).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const gkMedia = media.filter((m) => m.gkId === gk.id);

  return (
    <div className="space-y-5">
      <Link to="/goalkeepers" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> Goalkeepers</Link>

      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="flex items-center gap-4">
          <Avatar initials={gk.initials} size={56} />
          <div>
            <div className="flex items-center gap-2.5"><h1 className="text-2xl font-semibold tracking-tight">{gk.name}</h1><TierBadge tier={gk.tier} /></div>
            <div className="text-sm text-muted-foreground mt-1">{gk.club} · {gk.league} · {gk.nationality} · {gk.age} yrs · {gk.height} · {gk.foot} foot</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Log Interaction</button>
          <button className="h-9 px-3 rounded-md border border-border text-sm">Submit Report</button>
        </div>
      </div>

      <DataSourceBanner classification="mock" extra="Profile bio, ratings, assigned-mentor, interaction history, reports and media listed here are illustrative — not real operational records." />


      {gk.bio && (
        <Card className="p-4">
          <SectionTitle>Profile</SectionTitle>
          <p className="text-sm text-muted-foreground leading-relaxed">{gk.bio}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3"><div className="text-[10px] uppercase text-muted-foreground">Mentor</div><div className="text-sm font-medium mt-1">{mentor?.name}</div></Card>
        <Card className="p-3"><div className="text-[10px] uppercase text-muted-foreground">Rating</div><div className="text-xl font-semibold tabular-nums font-mono mt-1">{gk.rating}</div></Card>
        <Card className="p-3"><div className="text-[10px] uppercase text-muted-foreground">Potential</div><div className="text-xl font-semibold tabular-nums font-mono mt-1">{gk.potential}</div></Card>
        <Card className="p-3"><div className="text-[10px] uppercase text-muted-foreground">Contract</div><div className="text-sm font-medium mt-1">{gk.contractUntil}</div></Card>
        <Card className="p-3"><div className="text-[10px] uppercase text-muted-foreground">Recommendation</div><div className="mt-1"><Pill tone={gk.recommendation === "Sign" || gk.recommendation === "Retain" ? "success" : gk.recommendation === "Pass" ? "destructive" : "info"}>{gk.recommendation}</Pill></div></Card>
      </div>

      {gk.developmentPlan && gk.developmentPlan.length > 0 && (
        <Card className="p-4">
          <SectionTitle>Development Plan</SectionTitle>
          <ul className="space-y-1.5">
            {gk.developmentPlan.map((d: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground"><span className="text-primary mt-0.5">›</span>{d}</li>
            ))}
          </ul>
        </Card>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-4">
          <SectionTitle>Activity Timeline</SectionTitle>
          <div className="relative pl-5 space-y-3 before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-px before:bg-border">
            {gkInteractions.map((i) => {
              const Icon = TYPE_ICON[i.type] ?? FileText;
              return (
                <div key={i.id} className="relative">
                  <div className="absolute -left-[15px] top-1 size-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm font-medium"><Icon className="size-3.5 text-muted-foreground" />{i.type}</div>
                    <div className="text-[11px] text-muted-foreground tabular-nums font-mono">{formatDate(i.date)} · {formatRelative(i.date)}</div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">{i.notes}</div>
                  <div className="flex gap-1.5 mt-1.5"><Pill>{i.outcome}</Pill><Pill tone="info">↳ {i.followUp}</Pill></div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <SectionTitle>Reports ({gkReports.length})</SectionTitle>
            <div className="space-y-2">
              {gkReports.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center gap-2 p-2 rounded-md bg-accent/20 border border-border/40">
                  <FileText className="size-3.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{r.type}</div>
                    <div className="text-[10px] text-muted-foreground">{formatDate(r.date)}</div>
                  </div>
                  <span className="text-xs font-semibold tabular-nums font-mono">{r.rating}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle>Skill Scores (latest)</SectionTitle>
            {gkReports[0] && (
              <div className="space-y-2.5">
                {Object.entries(gkReports[0].scores).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-[11px] mb-1"><span className="capitalize text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</span><span className="tabular-nums font-mono font-medium">{v}/10</span></div>
                    <ProgressBar value={v * 10} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <SectionTitle>Media ({gkMedia.length})</SectionTitle>
            <div className="space-y-1.5">
              {gkMedia.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs gap-2">
                  <span className="truncate">{m.title}</span>
                  <Pill>{m.kind}</Pill>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
