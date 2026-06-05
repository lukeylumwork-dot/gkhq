import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { PageHeader, Card, Pill, SectionTitle } from "@/components/primitives";
import { reports, getGk, getMentor, formatDate } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import { FileText, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { WorkflowDialog, type WorkflowKind } from "@/components/workflows";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

const TYPES = ["All", "Goalkeeper Development", "Match Report", "Training Report", "Opposition GK", "Recruitment"] as const;

function ReportsPage() {
  const { can } = useAuth();
  const [type, setType] = useState<(typeof TYPES)[number]>("All");
  const [workflow, setWorkflow] = useState<WorkflowKind | null>(null);
  const router = useRouter();

  const sorted = [...reports].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const filtered = type === "All" ? sorted : sorted.filter((r) => r.type === type);

  // After submit, invalidate detail routes
  useEffect(() => {
    const h = () => router.invalidate();
    window.addEventListener("rpm:report-submitted", h);
    return () => window.removeEventListener("rpm:report-submitted", h);
  }, [router]);

  return (
    <div className="space-y-5">
      <PageHeader title="Report Submission Centre" description={`${reports.length} reports across all categories.`} action={can("reports.submit") ? (
        <button onClick={() => setWorkflow("report")} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">Submit Report</button>
      ) : null} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {TYPES.slice(1).map((t) => {
          const count = reports.filter((r) => r.type === t).length;
          return (
            <Card key={t} className="p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t}</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">{count}</div>
            </Card>
          );
        })}
      </div>

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
              <th className="px-2 py-2.5 font-medium">Author</th>
              <th className="px-2 py-2.5 font-medium">Summary</th>
              <th className="px-2 py-2.5 font-medium text-right">Rating</th>
              <th className="px-4 py-2.5 font-medium text-right" />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 60).map((r) => {
              const gk = getGk(r.gkId);
              const m = getMentor(r.authorId);
              return (
                <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-accent/20">
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{formatDate(r.date)}</td>
                  <td className="px-2"><Pill tone="info"><FileText className="size-2.5 mr-1 inline" />{r.type}</Pill></td>
                  <td className="px-2 font-medium">{gk?.name}</td>
                  <td className="px-2 text-muted-foreground">{m?.name}</td>
                  <td className="px-2 text-muted-foreground max-w-md"><span className="line-clamp-1">{r.summary}</span></td>
                  <td className="px-2 text-right tabular-nums font-semibold">{r.rating}</td>
                  <td className="px-4 text-right">
                    <Link to="/reports/$reportId" params={{ reportId: r.id }} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                      Open <ChevronRight className="size-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <SectionTitle>Showing {Math.min(60, filtered.length)} of {filtered.length}</SectionTitle>
      <WorkflowDialog kind={workflow} onClose={() => setWorkflow(null)} />
    </div>
  );
}
