import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, CalendarClock, ChevronDown, ChevronRight, FileText, Video, AlertTriangle } from "lucide-react";
import { Card, StatCard, SectionTitle, Avatar, TierBadge, TierLevelBadge, Pill } from "@/components/primitives";
import { getMentorDashboardStats } from "@/lib/mentor-dashboard.functions";
import type { Tier } from "@/lib/mock-data";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
  mentorProfileId: string;
}

function formatEventDateTime(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st"
    : day % 10 === 2 && day !== 12 ? "nd"
    : day % 10 === 3 && day !== 13 ? "rd"
    : "th";
  const month = d.toLocaleString("en-GB", { month: "long" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${month} ${day}${suffix} · ${time}`;
}

function formatRelativeTime(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function MentorDashboard({ user }: Props) {
  const fetchStats = useServerFn(getMentorDashboardStats);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mentor-dashboard-stats"],
    queryFn: () => fetchStats(),
  });

  const firstName = user.name.split(" ")[0];
  const upcoming = data?.upcomingList ?? [];
  const outstanding = data?.outstandingItems ?? [];
  const updatedAt = data?.lastUpdatedAt ? formatRelativeTime(data.lastUpdatedAt) : undefined;
  const period = "Last 14 days";
  const [showOutstanding, setShowOutstanding] = useState(false);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display font-bold uppercase tracking-[0.02em]">
          Hello, {firstName}
        </h1>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mt-2">
          {isLoading
            ? "Loading your dashboard…"
            : isError
              ? "Couldn't load your dashboard."
              : "Your reporting activity — last 14 days"}
        </p>
        {isError && (
          <button
            onClick={() => refetch()}
            className="mt-2 text-xs uppercase tracking-wider text-primary underline"
          >
            Retry
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          to="/reports"
          className="block rounded-lg transition-transform hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="View match reports"
        >
          <StatCard
            label="Match Reports Submitted"
            value={data?.reportsLast14 ?? 0}
            hint={period}
            accent="primary"
            updatedAt={updatedAt}
          />
        </Link>
        <Link
          to="/interactions"
          className="block rounded-lg transition-transform hover:-translate-y-0.5 hover:ring-1 hover:ring-info/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info"
          aria-label="View interactions"
        >
          <StatCard
            label="Interactions Logged"
            value={data?.interactionsLast14 ?? 0}
            hint={period}
            accent="info"
            updatedAt={updatedAt}
          />
        </Link>
        <Link
          to="/media"
          className="block rounded-lg transition-transform hover:-translate-y-0.5 hover:ring-1 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="View match clips"
        >
          <StatCard
            label="Match Clips Posted"
            value={data?.clipsLast14 ?? 0}
            hint={period}
            accent="primary"
            updatedAt={updatedAt}
          />
        </Link>
        <Link
          to="/reports"
          className="block rounded-lg transition-transform hover:-translate-y-0.5 hover:ring-1 hover:ring-destructive/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          aria-label="View outstanding actions"
        >
          <StatCard
            label="Outstanding Actions"
            value={data?.outstandingActions ?? 0}
            hint="Overdue reports & clip uploads"
            accent="destructive"
            emptyMessage="All caught up"
            updatedAt={updatedAt}
          />
        </Link>
      </div>

      <Card className="p-4">
        <SectionTitle
          action={
            <Link to="/calendar" className="text-xs text-primary inline-flex items-center gap-1">
              Open calendar <ArrowUpRight className="size-3" />
            </Link>
          }
        >
          Upcoming Interactions
        </SectionTitle>

        {upcoming.length === 0 ? (
          <div className="text-xs text-muted-foreground py-6 text-center">
            {isLoading ? "Loading…" : "No upcoming interactions in the next 14 days."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {upcoming.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2.5">
                <Avatar initials={e.gkInitials ?? "—"} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{e.gkName ?? "Unassigned"}</span>
                    {e.gkStatus && <TierBadge tier={e.gkStatus as Tier} />}
                    {e.gkFreeAgent && <Pill tone="warning">Free Agent</Pill>}
                    {e.gkTierLevel && <TierLevelBadge level={e.gkTierLevel} />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {e.gkClub ? `${e.gkClub}${e.gkLeague ? ` — ${e.gkLeague}` : ""}` : "Free Agent"}
                  </div>
                </div>
                <div className="hidden md:block text-sm font-medium text-foreground/90 truncate max-w-[240px]">
                  {e.plannedType ?? e.type}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-medium tabular-nums font-mono flex items-center gap-1 justify-end">
                    <CalendarClock className="size-3 text-muted-foreground" />
                    {formatEventDateTime(e.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
