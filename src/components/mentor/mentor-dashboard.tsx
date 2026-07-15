import { useEffect, useMemo, useReducer, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarClock, ChevronRight, ClipboardList, FileText,
  Mic, MessageSquarePlus, Search, TrendingUp, ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { Avatar, Card, DutyBadge, ProgressBar, SectionTitle, TrafficLight } from "@/components/primitives";
import { formatRelative } from "@/lib/mock-data";
import { MentorWorkflowDialog, type MentorWorkflowState } from "@/components/mentor/mentor-workflow";
import {
  selectAssignedPlayers,
  selectDutyForPlayer,
  selectDutyRollup,
  selectMediaCountByPlayer,
  selectMentorProgress,
  selectOverduePlayers,
  selectRecentInteractions,
  selectRecentReports,
  selectUpcomingForMentor,
  resolveMentorProfile,
  subscribeMentorSession,
  type DutyOfCareRow,
  type PlayerRow,
} from "@/lib/mentor-domain";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
  mentorProfileId: string;
}

const DUTY_PROMPT: Record<"red" | "amber", string> = {
  red: "Duty of care breach — contact today.",
  amber: "Approaching breach — schedule a touchpoint this week.",
};

export function MentorDashboard({ user, mentorProfileId }: Props) {
  const [workflow, setWorkflow] = useState<MentorWorkflowState | null>(null);
  const [query, setQuery] = useState("");
  const [tick, forceRefresh] = useReducer((n: number) => n + 1, 0);

  // Refresh selectors whenever the mentor submits a new interaction/report.
  useEffect(() => subscribeMentorSession(() => forceRefresh()), []);

  const profile = resolveMentorProfile(mentorProfileId);
  const roster = useMemo(() => selectAssignedPlayers(mentorProfileId), [mentorProfileId]);
  const rollup = useMemo(() => selectDutyRollup(mentorProfileId), [mentorProfileId]);
  const overdue = useMemo(() => selectOverduePlayers(mentorProfileId, 6), [mentorProfileId]);
  const upcoming = useMemo(() => selectUpcomingForMentor(mentorProfileId, 14, 5), [mentorProfileId]);
  const recentInteractions = useMemo(() => selectRecentInteractions(mentorProfileId, 5), [mentorProfileId, tick]);
  const recentReports = useMemo(() => selectRecentReports(mentorProfileId, 4), [mentorProfileId, tick]);
  const mediaCounts = useMemo(() => selectMediaCountByPlayer(mentorProfileId), [mentorProfileId]);
  const progress = useMemo(() => selectMentorProgress(mentorProfileId), [mentorProfileId]);

  const filteredRoster = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.club.toLowerCase().includes(q) ||
        p.league.toLowerCase().includes(q),
    );
  }, [roster, query]);

  const greeting = `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${user.name.split(" ")[0]}`;

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">{greeting}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {profile?.region ?? "Mentor"} · {roster.length} goalkeepers in the RPM roster
          </p>
        </div>
        <div className="shrink-0 hidden sm:flex flex-col items-end">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">This month</div>
          <div className="tabular-nums font-mono text-lg font-semibold">
            {progress.completed}<span className="text-muted-foreground text-sm">/{progress.target}</span>
          </div>
          <div className="w-32 mt-1"><ProgressBar value={progress.pct} tone={progress.pct >= 80 ? "primary" : progress.pct >= 50 ? "info" : "warning"} /></div>
        </div>
      </header>

      {/* Quick actions (mobile: pill row / desktop: grid) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <QuickAction icon={MessageSquarePlus} label="Log interaction" onClick={() => setWorkflow({ kind: "interaction" })} />
        <QuickAction icon={FileText} label="Match report" onClick={() => setWorkflow({ kind: "report" })} tone="info" />
        <QuickAction icon={Mic} label="Voice note" onClick={() => setWorkflow({ kind: "voice" })} tone="warning" />
      </div>

      {/* Priority queue (duty of care prompts) */}
      <Card className="p-4">
        <SectionTitle
          action={
            <div className="flex items-center gap-2">
              <TrafficLight level="green" size={8} />
              <span className="text-[11px] tabular-nums font-mono text-muted-foreground">{rollup.green}</span>
              <TrafficLight level="amber" size={8} />
              <span className="text-[11px] tabular-nums font-mono text-muted-foreground">{rollup.amber}</span>
              <TrafficLight level="red" size={8} />
              <span className="text-[11px] tabular-nums font-mono text-muted-foreground">{rollup.red}</span>
            </div>
          }
        >
          Today's priorities
        </SectionTitle>

        {overdue.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            All goalkeepers within contact window. Nothing urgent.
          </div>
        ) : (
          <ul className="divide-y divide-border -mx-1">
            {overdue.map(({ player, duty }) => (
              <li key={player.id} className="px-1">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 -mx-2 px-2 rounded-md">
                  <Link
                    to="/goalkeepers/$gkId"
                    params={{ gkId: player.id }}
                    className="contents"
                  >
                    <div className="relative shrink-0">
                      <Avatar initials={player.initials} size={36} />
                      <span className="absolute -bottom-0.5 -right-0.5 ring-2 ring-card rounded-full">
                        <TrafficLight level={duty.level} size={10} />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm truncate">{player.full_name}</span>
                        <span className="text-[10px] tabular-nums font-mono text-muted-foreground shrink-0">{duty.days_since_contact}d</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{player.club}</div>
                      <div className={`text-[11px] mt-0.5 truncate ${duty.level === "red" ? "text-destructive" : "text-warning"}`}>
                        {DUTY_PROMPT[duty.level as "red" | "amber"]}
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setWorkflow({ kind: "interaction", playerId: player.id })}
                    className="shrink-0 h-9 px-3 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 inline-flex items-center gap-1.5"
                  >
                    <MessageSquarePlus className="size-3.5" /> Log
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Roster search + list */}
        <Card className="lg:col-span-2 p-4">
          <SectionTitle
            action={
              <Link to="/goalkeepers" className="text-xs text-primary inline-flex items-center gap-1">
                All goalkeepers <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            My goalkeepers
          </SectionTitle>

          <div className="relative mb-3">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, club or league"
              className="w-full h-10 pl-9 pr-3 rounded-md bg-input/60 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              inputMode="search"
            />
          </div>

          <ul className="divide-y divide-border max-h-[420px] overflow-y-auto -mx-1">
            {filteredRoster.slice(0, 30).map((p) => (
              <RosterRow key={p.id} player={p} mediaCount={mediaCounts[p.id] ?? 0} />
            ))}
            {filteredRoster.length === 0 && (
              <li className="text-sm text-muted-foreground text-center py-8">No goalkeepers match "{query}".</li>
            )}
          </ul>
        </Card>

        {/* Upcoming */}
        <Card className="p-4">
          <SectionTitle
            action={
              <Link to="/calendar" className="text-xs text-primary inline-flex items-center gap-1">
                Calendar <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            Upcoming — next 14 days
          </SectionTitle>
          {upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Nothing scheduled.</div>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-start gap-3 p-2 rounded-md bg-accent/20 border border-border/50">
                  <div className="size-9 grid place-items-center rounded-md bg-primary/10 text-primary shrink-0">
                    <CalendarClock className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{e.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {e.event_type} · {formatRelative(e.occurred_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent interactions */}
        <Card className="p-4">
          <SectionTitle
            action={
              <Link to="/interactions" className="text-xs text-primary inline-flex items-center gap-1">
                All interactions <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            Recent interactions
          </SectionTitle>
          {recentInteractions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              You haven't logged any interactions yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {recentInteractions.map((i) => (
                <li key={i.id} className="flex items-start gap-3 py-1.5">
                  <div className="size-8 grid place-items-center rounded-md bg-accent shrink-0">
                    <ClipboardList className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate"><span className="font-medium">{i.interaction_type}</span></div>
                    <div className="text-[11px] text-muted-foreground truncate">{i.notes}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{formatRelative(i.occurred_at)} · {i.outcome}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent reports */}
        <Card className="p-4">
          <SectionTitle
            action={
              <Link to="/reports" className="text-xs text-primary inline-flex items-center gap-1">
                All reports <ArrowUpRight className="size-3" />
              </Link>
            }
          >
            Recent reports
          </SectionTitle>
          {recentReports.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              You haven't submitted any reports yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {recentReports.map((r) => (
                <li key={r.id} className="flex items-start gap-3 py-1.5">
                  <div className="size-8 grid place-items-center rounded-md bg-info/10 text-info shrink-0">
                    <TrendingUp className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate"><span className="font-medium">{r.report_type}</span> · {r.overall_rating}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{r.summary}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{formatRelative(r.occurred_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Mobile-only sticky action bar */}
      <div className="fixed bottom-0 inset-x-0 md:hidden bg-background/95 backdrop-blur border-t border-border p-3 z-30 flex gap-2 safe-area-inset-bottom">
        <button
          onClick={() => setWorkflow({ kind: "interaction" })}
          className="flex-1 h-11 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center gap-1.5"
        >
          <MessageSquarePlus className="size-4" /> Log interaction
        </button>
        <button
          onClick={() => setWorkflow({ kind: "voice" })}
          className="h-11 px-3 rounded-md border border-border text-sm font-medium inline-flex items-center gap-1.5"
          aria-label="Voice note"
        >
          <Mic className="size-4" />
        </button>
        <button
          onClick={() => setWorkflow({ kind: "report" })}
          className="h-11 px-4 rounded-md border border-border text-sm font-medium inline-flex items-center gap-1.5"
        >
          <FileText className="size-4" /> Report
        </button>
      </div>

      <MentorWorkflowDialog
        state={workflow}
        mentorProfileId={mentorProfileId}
        onClose={() => setWorkflow(null)}
      />
    </div>
  );
}

function QuickAction({
  icon: Icon, label, onClick, tone = "primary",
}: { icon: LucideIcon; label: string; onClick: () => void; tone?: "primary" | "info" | "warning" }) {
  const bg =
    tone === "info" ? "bg-info/10 text-info hover:bg-info/15 border-info/20"
    : tone === "warning" ? "bg-warning/10 text-warning hover:bg-warning/15 border-warning/20"
    : "bg-primary/10 text-primary hover:bg-primary/15 border-primary/20";
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 h-20 sm:h-24 rounded-lg border transition-colors ${bg}`}
    >
      <Icon className="size-5" />
      <span className="text-[11px] sm:text-xs font-medium text-center px-1 leading-tight">{label}</span>
    </button>
  );
}

function RosterRow({ player, mediaCount }: { player: PlayerRow; mediaCount: number }) {
  const duty: DutyOfCareRow | null = selectDutyForPlayer(player.id);
  return (
    <li>
      <Link
        to="/goalkeepers/$gkId"
        params={{ gkId: player.id }}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2.5 px-2 -mx-1 rounded-md hover:bg-accent/30 transition-colors"
      >
        <Avatar initials={player.initials} size={32} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate">{player.full_name}</span>
            {duty && <DutyBadge level={duty.level} label={duty.label} />}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {player.club} · {player.league}
            {mediaCount > 0 && <> · {mediaCount} media</>}
          </div>
        </div>
        <div className="text-right shrink-0 flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Next</div>
            <div className="text-xs tabular-nums font-mono">{formatRelative(player.next_fixture_at)}</div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
      </Link>
    </li>
  );
}
