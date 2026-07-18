/**
 * Match Report server functions.
 *
 * All handlers require an authenticated Supabase session. The caller's role
 * and display name are looked up from the database (`user_roles`, `profiles`)
 * — never trusted from client input.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  matchReportSubmitSchema,
  averageOfScores,
  computeReportId,
  rowToMatchReport,
  formatSheetDate,
  COLUMN_INDEX,
  PILLAR_IDS,
  type MatchReportRow,
} from "./schema";

// NOTE: helpers used inside `createServerFn` handlers must be declared inside the
// handler or in a separate imported module — the splitter deletes sibling module-
// scope consts before shipping. See tanstack-serverfn-splitting.


// ---------------------------------------------------------------------------
// listMatchReports
// ---------------------------------------------------------------------------

export const listMatchReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {

  const { readAllRows } = await import("./sheets.server");
  const { rows, firstDataRow } = await readAllRows();
  const parsed: MatchReportRow[] = [];
  rows.forEach((row, i) => {
    const r = rowToMatchReport(row, firstDataRow + i);
    if (r) parsed.push(r);
  });
  // Newest first (by match_date, missing dates last).
  parsed.sort((a, b) => {
    if (!a.match_date && !b.match_date) return 0;
    if (!a.match_date) return 1;
    if (!b.match_date) return -1;
    return a.match_date < b.match_date ? 1 : a.match_date > b.match_date ? -1 : 0;
  });

  // Best-effort cache upsert. Failures don't block the read.
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (parsed.length) {
      await supabaseAdmin.from("match_reports_cache").upsert(
        parsed.map((r) => ({
          report_id: r.report_id,
          row_index: r.row_index,
          goalkeeper: r.goalkeeper,
          coach: r.coach,
          team: r.team,
          opponent: r.opponent,
          competition: r.competition,
          match_date: r.match_date,
          protect_goal: r.scores.protect_goal,
          protect_space: r.scores.protect_space,
          protect_air: r.scores.protect_air,
          control_play: r.scores.control_play,
          change_play: r.scores.change_play,
          psych: r.scores.psych,
          physical: r.scores.physical,
          average: r.average,
          comments: r.comments,
          synced_at: new Date().toISOString(),
        })),
        { onConflict: "report_id" },
      );
    }
  } catch (e) {
    console.error("[match-reports] cache upsert skipped:", e);
  }

  return { reports: parsed };
});

// ---------------------------------------------------------------------------
// getMatchReport
// ---------------------------------------------------------------------------

export const getMatchReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { reportId: string }) =>
    z.object({ reportId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { readAllRows } = await import("./sheets.server");
    const { rows, firstDataRow } = await readAllRows();
    for (let i = 0; i < rows.length; i++) {
      const r = rowToMatchReport(rows[i], firstDataRow + i);
      if (r && r.report_id === data.reportId) return { report: r };
    }
    return { report: null };
  });

// ---------------------------------------------------------------------------
// submitMatchReport
// ---------------------------------------------------------------------------

export const submitMatchReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    return z.object({ payload: matchReportSubmitSchema }).parse(data);
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { payload } = data;

    // Look up the caller's real role from the database — never trust the client.
    const { data: roleRows, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roleErr) throw new Error("Unable to verify caller role.");

    const roles = (roleRows ?? []).map((r) => r.role as string);
    const effectiveRole =
      roles.includes("super_admin") ? "super_admin" :
      roles.includes("admin") ? "admin" :
      roles.includes("mentor_manager") ? "mentor_manager" :
      roles.includes("mentor") ? "mentor" : null;

    const CAN_SUBMIT = ["super_admin", "mentor_manager", "mentor"];
    const CAN_OVERRIDE_COACH = ["super_admin", "admin", "mentor_manager"];

    if (!effectiveRole || !CAN_SUBMIT.includes(effectiveRole)) {
      throw new Error("You don't have permission to submit reports.");
    }

    // Look up caller's canonical name from profiles.
    const { data: profile } = await supabase
      .from("profiles")
      .select("name,email")
      .eq("id", userId)
      .maybeSingle<{ name: string | null; email: string | null }>();
    const callerName = (profile?.name || profile?.email || "").trim();

    // Non-privileged roles cannot submit on another coach's behalf.
    if (
      !CAN_OVERRIDE_COACH.includes(effectiveRole) &&
      payload.coach.trim().toLowerCase() !== callerName.toLowerCase()
    ) {
      throw new Error("Only managers/admins can submit on another coach's behalf.");
    }

    const average = averageOfScores(payload);
    const { appendRow } = await import("./sheets.server");

    // Column order MUST match COLUMN_INDEX / SHEET_HEADERS.
    const row = new Array<string | number>(15).fill("");
    row[COLUMN_INDEX.goalkeeper] = payload.goalkeeper;
    row[COLUMN_INDEX.coach] = payload.coach;
    row[COLUMN_INDEX.team] = payload.team;
    row[COLUMN_INDEX.opponent] = payload.opponent;
    row[COLUMN_INDEX.match_date] = formatSheetDate(payload.match_date);
    for (const id of PILLAR_IDS) row[COLUMN_INDEX[id]] = payload[id];
    row[COLUMN_INDEX.average] = average;
    row[COLUMN_INDEX.comments] = payload.comments ?? "";
    row[COLUMN_INDEX.competition] = payload.competition ?? "";

    const rowIndex = await appendRow(row);

    const report_id = computeReportId({
      goalkeeper: payload.goalkeeper,
      match_date: payload.match_date,
      opponent: payload.opponent,
    });

    // Mirror into cache immediately so /reports reflects the new row without a re-read.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("match_reports_cache").upsert(
        [
          {
            report_id,
            row_index: rowIndex > 0 ? rowIndex : null,
            goalkeeper: payload.goalkeeper,
            coach: payload.coach,
            team: payload.team,
            opponent: payload.opponent,
            competition: payload.competition ?? "",
            match_date: payload.match_date,
            protect_goal: payload.protect_goal,
            protect_space: payload.protect_space,
            protect_air: payload.protect_air,
            control_play: payload.control_play,
            change_play: payload.change_play,
            psych: payload.psych,
            physical: payload.physical,
            average,
            comments: payload.comments ?? "",
            synced_at: new Date().toISOString(),
          },
        ],
        { onConflict: "report_id" },
      );
    } catch (e) {
      console.error("[match-reports] cache mirror on submit failed:", e);
    }

    return { report_id, row_index: rowIndex, average };
  });

