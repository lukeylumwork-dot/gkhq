import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Card, Pill, SectionTitle } from "@/components/primitives";
import { useEffect, useMemo, useState } from "react";
import { FileText, ChevronRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { WorkflowDialog, type WorkflowKind } from "@/components/workflows";
import { withPermission } from "@/components/require-permission";
import { listMatchReports } from "@/lib/match-reports/reports.functions";
import type { MatchReportRow } from "@/lib/match-reports/schema";

export const Route = createFileRoute("/reports")({ component: withPermission(ReportsPage, "reports.view") });

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function ReportsPage() {
  const { can } = useAuth();
  const [workflow, setWorkflow] = useState<WorkflowKind | null>(null);
  const [coachFilter, setCoachFilter] = useState<string>("All");
  const router = useRouter();
  const listFn = useServerFn(listMatchReports);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["match-reports"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const reports: MatchReportRow[] = data?.reports ?? [];

  useEffect(() => {
    const h = () => { void refetch(); router.invalidate(); };
    window.addEventListener("rpm:report-submitted", h);
    return () => window.removeEventListener("rpm:report-submitted", h);
  }, [refetch, router]);

  const coaches = useMemo(() => {
    const s = new Set<string>();
    reports.forEach((r) => r.coach && s.add(r.coach));
    return ["All", ...Array.from(s).sort()];
  }, [reports]);

  const filtered = coachFilter === "All"
    ? reports
    : reports.filter((r) => r.coach === coachFilter);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Match Report Submission Centre"
        description={
          isLoading
            ? "Loading match reports from Google Sheets…"
            : `${reports.length} match reports · source: RPM Match Reports Sheet`
        }
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} disabled={isFetching}
              className="h-9 px-3 rounded-md border border-border text-sm inline-flex items-center gap-1.5 disabled:opacity-60">
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {can("reports.submit") && (
              <button onClick={() => setWorkflow("report")}
                className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">
                Submit Match Report
              </button>
            )}
          </div>
        }
      />

      {error ? (
        <Card className="p-4 text-sm text-destructive">
          Couldn't load reports: {(error as Error).message}
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {coaches.map((c) => (
          <button key={c} onClick={() => setCoachFilter(c)}
            className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
              coachFilter === c
                ? "bg-accent border-accent text-accent-foreground"
                : "border-border hover:bg-accent/40 text-muted-foreground"
            }`}>
            {c}
          </button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-2.5 font-medium">Match Date</th>
                <th className="px-2 py-2.5 font-medium">Goalkeeper</th>
                <th className="px-2 py-2.5 font-medium">Coach</th>
                <th className="px-2 py-2.5 font-medium">Team</th>
                <th className="px-2 py-2.5 font-medium">Opponent</th>
                <th className="px-2 py-2.5 font-medium">Comments</th>
                <th className="px-2 py-2.5 font-medium text-right">Avg</th>
                <th className="px-4 py-2.5 font-medium text-right" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No match reports yet.</td></tr>
              )}
              {filtered.slice(0, 100).map((r) => (
                <tr key={r.report_id} className="border-b border-border/60 last:border-0 hover:bg-accent/20">
                  <td className="px-4 py-2.5 text-muted-foreground tabular-nums font-mono whitespace-nowrap">{formatDate(r.match_date)}</td>
                  <td className="px-2 font-medium">{r.goalkeeper}</td>
                  <td className="px-2 text-muted-foreground">{r.coach}</td>
                  <td className="px-2 text-muted-foreground">{r.team ?? "—"}</td>
                  <td className="px-2 text-muted-foreground">{r.opponent ?? "—"}</td>
                  <td className="px-2 text-muted-foreground max-w-md"><span className="line-clamp-1">{r.comments}</span></td>
                  <td className="px-2 text-right tabular-nums font-mono font-semibold">{r.average != null ? r.average.toFixed(1) : "—"}</td>
                  <td className="px-4 text-right">
                    <Link to="/reports/$reportId" params={{ reportId: r.report_id }} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                      Open <ChevronRight className="size-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <SectionTitle>Showing {Math.min(100, filtered.length)} of {filtered.length}</SectionTitle>
      <WorkflowDialog kind={workflow} onClose={() => setWorkflow(null)} />
    </div>
  );
}
