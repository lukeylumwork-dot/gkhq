import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { goalkeepers, interactions, reports, media, calendarEvents, mentors } from "@/lib/mock-data";
import type { TierLevel } from "@/lib/mock-data";

export type UpcomingPlannedType =
  | "Coffee Meeting"
  | "Attend Live Match"
  | "Training Ground Visit"
  | string;

export interface MentorUpcomingInteraction {
  id: string;
  date: string;
  title: string;
  type: string;
  plannedType: UpcomingPlannedType | null;
  gkId: string | null;
  gkName: string | null;
  gkInitials: string | null;
  gkStatus: string | null;
  gkTierLevel: TierLevel | null;
  gkClub: string | null;
  gkLeague: string | null;
  gkFreeAgent: boolean;
}

export interface MentorDashboardStats {
  mentorProfileId: string | null;
  reportsLast14: number;
  interactionsLast14: number;
  clipsLast14: number;
  outstandingActions: number;
  upcomingList: MentorUpcomingInteraction[];
  lastUpdatedAt: string;
}

// Map calendar event types to the supported in-person planned interaction
// types the pilot brief lists. Falls back to the original label when no
// clean mapping exists.
function mapPlannedType(type: string): UpcomingPlannedType | null {
  switch (type) {
    case "Match":
    case "Observation":
      return "Attend Live Match";
    case "Mentor Visit":
      return "Training Ground Visit";
    case "Meeting":
      return "Coffee Meeting";
    default:
      return null;
  }
}

/**
 * Server-side mentor dashboard aggregation.
 *
 * Stats are scoped to the signed-in mentor's OWN submissions and calendar,
 * not to a roster of assigned goalkeepers. Mentors work collaboratively
 * across the whole RPM roster.
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

    // Allow super admins previewing the mentor view to see populated data.
    if (!mentorId && (roles ?? []).some((r) => r.role === "super_admin")) {
      mentorId = "m-david-rouse";
    }

    const now = Date.now();
    const in14 = now + 14 * 86400000;
    const ago14 = now - 14 * 86400000;

    if (!mentorId) {
      return {
        mentorProfileId: null,
        reportsLast14: 0,
        interactionsLast14: 0,
        clipsLast14: 0,
        outstandingActions: 0,
        upcomingList: [],
        lastUpdatedAt: new Date().toISOString(),
      };
    }

    const mentorName = mentors.find((m) => m.id === mentorId)?.name;
    const gkById = new Map(goalkeepers.map((g) => [g.id, g]));

    // Activity by this mentor in the last 14 days.
    const reportsLast14 = reports.filter(
      (r) => r.authorId === mentorId && +new Date(r.date) >= ago14 && +new Date(r.date) <= now,
    ).length;

    const mentorInteractions14 = interactions.filter(
      (i) => i.mentorId === mentorId && +new Date(i.date) >= ago14 && +new Date(i.date) <= now,
    );
    const interactionsLast14 = mentorInteractions14.length;

    const clipsLast14 = media.filter(
      (m) =>
        m.kind === "video" &&
        (mentorName ? m.uploadedBy === mentorName : false) &&
        +new Date(m.date) >= ago14 &&
        +new Date(m.date) <= now,
    ).length;

    // Outstanding actions: live match observations logged by this mentor
    // in the last 30 days that lack either a follow-up match report or a
    // matching video clip within ±3 days of the observation date.
    const mentorObservations = interactions.filter(
      (i) =>
        i.mentorId === mentorId &&
        i.type === "Live Match Observation" &&
        +new Date(i.date) >= now - 30 * 86400000 &&
        +new Date(i.date) <= now - 3 * 86400000,
    );
    const mentorReports = reports.filter((r) => r.authorId === mentorId);
    const mentorClips = media.filter(
      (m) => m.kind === "video" && (mentorName ? m.uploadedBy === mentorName : false),
    );
    const within3d = (a: string, b: string) =>
      Math.abs(+new Date(a) - +new Date(b)) <= 3 * 86400000;

    let outstandingActions = 0;
    for (const obs of mentorObservations) {
      const hasReport = mentorReports.some(
        (r) => r.gkId === obs.gkId && within3d(r.date, obs.date),
      );
      const hasClip = mentorClips.some(
        (m) => m.gkId === obs.gkId && within3d(m.date, obs.date),
      );
      if (!hasReport) outstandingActions += 1;
      if (!hasClip) outstandingActions += 1;
    }

    // Upcoming interactions: this mentor's calendar in the next 14 days.
    const upcomingEvents = calendarEvents
      .filter((e) => e.mentorId === mentorId && +new Date(e.date) >= now && +new Date(e.date) <= in14)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));

    const upcomingList: MentorUpcomingInteraction[] = upcomingEvents.map((e) => {
      const gk = e.gkId ? gkById.get(e.gkId) ?? null : null;
      return {
        id: e.id,
        date: e.date,
        title: e.title,
        type: e.type,
        plannedType: mapPlannedType(e.type),
        gkId: gk?.id ?? null,
        gkName: gk?.name ?? null,
        gkInitials: gk?.initials ?? null,
        gkStatus: gk?.status ?? null,
        gkTierLevel: gk?.tierLevel ?? null,
        gkClub: gk?.club ?? null,
        gkLeague: gk?.league ?? null,
        gkFreeAgent: gk?.status === "Free Agent",
      };
    });

    return {
      mentorProfileId: mentorId,
      reportsLast14,
      interactionsLast14,
      clipsLast14,
      outstandingActions,
      upcomingList,
      lastUpdatedAt: new Date().toISOString(),
    };
  });
