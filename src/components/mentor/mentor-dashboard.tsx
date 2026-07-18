import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { StatCard } from "@/components/primitives";
import { getMentorDashboardStats } from "@/lib/mentor-dashboard.functions";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
  mentorProfileId: string;
}

export function MentorDashboard({ user }: Props) {
  const fetchStats = useServerFn(getMentorDashboardStats);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mentor-dashboard-stats"],
    queryFn: () => fetchStats(),
  });

  const firstName = user.name.split(" ")[0];

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
    </div>
  );
}
