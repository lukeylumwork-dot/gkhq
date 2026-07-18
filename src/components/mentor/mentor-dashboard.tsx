import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { Card, StatCard, SectionTitle, Avatar, TierBadge, Pill } from "@/components/primitives";
import { getMentorDashboardStats } from "@/lib/mentor-dashboard.functions";
import type { Tier } from "@/lib/mock-data";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
  mentorProfileId: string;
}

function formatEventDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st"
    : day % 10 === 2 && day !== 12 ? "nd"
    : day % 10 === 3 && day !== 13 ? "rd"
    : "th";
  return `on ${d.toLocaleString("en-GB", { month: "long" })} ${day}${suffix}`;
}

export function MentorDashboard({ user }: Props) {
  const fetchStats = useServerFn(getMentorDashboardStats);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mentor-dashboard-stats"],
    queryFn: () => fetchStats(),
  });

  const firstName = user.name.split(" ")[0];
  const upcoming = data?.upcomingList ?? [];

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
              : "Here's the latest on your assigned goalkeepers"}
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
        <StatCard label="Total Goalkeepers" value={data?.totalGoalkeepers ?? 0} hint="Assigned to you" />
        <StatCard label="Upcoming Live Interactions" value={data?.upcomingInteractions ?? 0} hint="In the next 14 days" accent="info" emptyMessage="No upcoming sessions" />
        <StatCard label="Match Reports" value={data?.reportsLast14 ?? 0} hint="Submitted in the last 14 days" accent="primary" />
        <StatCard label="Match Clips" value={data?.clipsLast14 ?? 0} hint="Posted in the last 14 days" accent="primary" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Overdue Match Reports" value={data?.overdueReports ?? 0} hint="Action required" accent="destructive" emptyMessage="All caught up" />
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
                    {e.gkTier && <TierBadge tier={e.gkTier as Tier} />}
                    {e.gkFreeAgent && <Pill tone="warning">Free Agent</Pill>}
                    {e.gkInjured && <Pill tone="destructive">Injured</Pill>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {e.gkClub ? `${e.gkClub}${e.gkLeague ? ` — ${e.gkLeague}` : ""}` : "Free Agent"}
                  </div>
                </div>
                <div className="hidden md:block text-sm font-medium text-foreground/90 truncate max-w-[240px]">
                  {e.type}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-medium tabular-nums font-mono flex items-center gap-1 justify-end">
                    <CalendarClock className="size-3 text-muted-foreground" />
                    {formatEventDate(e.date)}
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
