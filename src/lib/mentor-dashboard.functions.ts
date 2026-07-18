import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { goalkeepers, interactions, reports, media, calendarEvents, dutyStatusForGk } from "@/lib/mock-data";

export interface MentorDashboardStats {
  mentorProfileId: string | null;
  totalGoalkeepers: number;
  upcomingInteractions: number;
  reportsLast14: number;
  clipsLast14: number;
  overdueReports: number;
}

/**
 * Server-side mentor dashboard aggregation.
 *
 * The mentor identity is derived from the authenticated session's profile
 * (profiles.mentor_id) — never accepted from the client — so a mentor can
 * only see counts scoped to their own assigned goalkeepers.
 */
export const getMentorDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MentorDashboardStats> => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("mentor_id").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    let mentorId = profile?.mentor_id ?? null;

    // Allow super admins who are testing the mentor view to see a populated
    // dashboard even if their own profile has no mentor_id. This is a local
    // mock-data fallback and is gated by the server-side auth check above.
    if (!mentorId && (roles ?? []).some((r) => r.role === "super_admin")) {
      mentorId = "m-david-rouse";
    }

    if (!mentorId) {
      return {
        mentorProfileId: null,
        totalGoalkeepers: 0,
        upcomingInteractions: 0,
        reportsLast14: 0,
        clipsLast14: 0,
        overdueReports: 0,
      };
    }

    const now = Date.now();
    const in14 = now + 14 * 86400000;
    const ago14 = now - 14 * 86400000;

    const roster = goalkeepers.filter((g) => g.mentorId === mentorId);
    const rosterIds = new Set(roster.map((g) => g.id));

    const upcomingInteractions = calendarEvents.filter(
      (e) => e.mentorId === mentorId && +new Date(e.date) >= now && +new Date(e.date) <= in14,
    ).length;

    const reportsLast14 = reports.filter(
      (r) => r.authorId === mentorId && +new Date(r.date) >= ago14 && +new Date(r.date) <= now,
    ).length;

    const clipsLast14 = media.filter(
      (m) => rosterIds.has(m.gkId) && +new Date(m.date) >= ago14 && +new Date(m.date) <= now,
    ).length;

    const overdueReports = roster.filter((g) => dutyStatusForGk(g).level === "red").length;

    // interactions is imported to keep the mentor-scoped domain surface complete
    // for future extensions (e.g. recent-activity feed) without another round-trip.
    void interactions;

    return {
      mentorProfileId: mentorId,
      totalGoalkeepers: roster.length,
      upcomingInteractions,
      reportsLast14,
      clipsLast14,
      overdueReports,
    };
  });
