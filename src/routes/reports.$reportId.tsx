import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader, Card, Pill } from "@/components/primitives";
import { reports, getGk, getMentor, formatDate } from "@/lib/mock-data";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileText, Video, Image as ImageIcon, Mic, ExternalLink } from "lucide-react";
import { listReportAttachments, openAsset, type MediaAsset } from "@/lib/media-store";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/reports/$reportId")({
  component: ReportDetail,
  notFoundComponent: () => (
    <Card className="p-10 text-center text-sm text-muted-foreground">Report not found.</Card>
  ),
  errorComponent: ({ error }) => (
    <Card className="p-10 text-center text-sm text-destructive">{error.message}</Card>
  ),
  loader: ({ params }) => {
    const r = reports.find((x) => x.id === params.reportId);
    if (!r) throw notFound();
    return { report: r };
  },
});

const ICON: Record<string, typeof FileText> = { video: Video, pdf: FileText, image: ImageIcon, audio: Mic };

function ReportDetail() {
  const { report: r } = Route.useLoaderData();
  const { user } = useAuth();
  const gk = getGk(r.gkId);
  const author = getMentor(r.authorId);
  const [attachments, setAttachments] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAttachments(await listReportAttachments(r.id)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [r.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <Link to="/reports" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="size-3" />Back to reports
      </Link>

      <PageHeader
        title={`${r.type} — ${gk?.name ?? "Unknown"}`}
        description={`${formatDate(r.date)} · Author: ${author?.name ?? "—"}`}
        action={<div className="text-right"><div className="text-[11px] text-muted-foreground uppercase tracking-wider">Overall Rating</div><div className="text-3xl font-semibold tabular-nums">{r.rating}</div></div>}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Written Observations</div>
          <p className="text-sm leading-relaxed text-foreground/90">{r.summary}</p>
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Structured Scoring</div>
          <ul className="space-y-1.5 text-sm">
            {Object.entries(r.scores).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between">
                <span className="capitalize text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</span>
                <span className="font-semibold tabular-nums">{String(v)}/10</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Attached Media</div>
          <span className="text-xs text-muted-foreground">{attachments.length} attached</span>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground py-4">Loading…</div>
        ) : attachments.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">No media attached to this report.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {attachments.map((a) => {
              const Icon = ICON[a.media_type] ?? FileText;
              return (
                <button key={a.id} onClick={() => openAsset(a, user)} className="text-left">
                  <Card className="overflow-hidden hover:border-primary/40 transition-colors">
                    <div className="aspect-video bg-gradient-to-br from-accent/40 to-muted grid place-items-center relative">
                      <Icon className="size-8 text-muted-foreground" />
                      <ExternalLink className="size-3.5 absolute top-1.5 right-1.5 text-muted-foreground" />
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-medium line-clamp-1">{a.title}</div>
                      <div className="flex items-center justify-between mt-1">
                        <Pill>{a.media_type}</Pill>
                        <span className="text-[10px] text-muted-foreground">{formatDate(a.created_at)}</span>
                      </div>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
