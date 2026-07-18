import { useMemo } from "react";
import { StatCard } from "@/components/primitives";
import {
  selectAssignedPlayers,
  selectRecentReports,
  selectUpcomingForMentor,
  selectDutyOfCareForMentor,
} from "@/lib/mentor-domain";
import { media } from "@/lib/mock-data";
import type { SessionUser } from "@/lib/auth";

interface Props {
  user: SessionUser;
  mentorProfileId: string;
}

export function MentorDashboard({ user, mentorProfileId }: Props) {
  const roster = useMemo(() => selectAssignedPlayers(mentorProfileId), [mentorProfileId]);
  const upcoming = useMemo(() => selectUpcomingForMentor(mentorProfileId, 14, 999), [mentorProfileId]);
  const recentReports = useMemo(() => selectRecentReports(mentorProfileId, 999), [mentorProfileId]);

  const now = Date.now();
  const fourteenDaysAgo = now - 14 * 86400000;

  const reportsLast14 = recentReports.filter(
    (r) => +new Date(r.occurred_at) >= fourteenDaysAgo && +new Date(r.occurred_at) <= now,
  ).length;

  const clipsLast14 = useMemo(() => {
    const rosterIds = new Set(roster.map((p) => p.id));
    return media.filter(
      (m) =>
        rosterIds.has(m.gkId) &&
        +new Date(m.date) >= fourteenDaysAgo &&
        +new Date(m.date) <= now,
    ).length;
  }, [roster, fourteenDaysAgo, now]);

  const overdueReports = useMemo(
    () => selectDutyOfCareForMentor(mentorProfileId).filter((d) => d.level === "red").length,
    [mentorProfileId],
  );

  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display font-bold uppercase tracking-[0.02em]">
          Hello, {firstName}
        </h1>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mt-2">
          Here's the latest on your dashboard
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Goalkeepers"
          value={roster.length}
          hint="Across all tiers & competitions"
        />
        <StatCard
          label="Upcoming Live Interactions"
          value={upcoming.length}
          hint="In the next 14 days"
          accent="info"
        />
        <StatCard
          label="Match Reports"
          value={reportsLast14}
          hint="Submitted in the last 14 days"
          accent="primary"
        />
        <StatCard
          label="Match Clips"
          value={clipsLast14}
          hint="Posted in the last 14 days"
          accent="primary"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Overdue Match Reports"
          value={overdueReports}
          hint="Action required"
          accent="destructive"
        />
      </div>
    </div>
  );
}
