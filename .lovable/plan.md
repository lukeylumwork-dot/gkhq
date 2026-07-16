
# GKHQ pilot conformance — final revised implementation plan

No code, migrations, database, or auth changes performed by this document. Existing production Supabase is the canonical backend. MCP source is preserved throughout.

**Data-source classification used below** — applied per record/section, never per viewer:
- **Live** — sourced from the canonical production backend (or a verified live integration) at read time.
- **Mock** — hard-coded in `src/lib/mock-data.ts` or equivalent seed helpers.
- **Transitional** — real user input, but the persistence path is not yet verified end-to-end (currently: Google Sheets match-report submission).
- **Unverified** — displayed as if operational but its source or freshness is not confirmed.

**Security posture disclaimer** — everything in Phases 1–4 is UI/interface behaviour. Any per-record edit rule, private/shared visibility, or role gate rendered in the client is **not secure for real data** until matching RLS policies are implemented and tested in Phase 5. Every relevant change below repeats this.

**Change-management principle** — Do not destructively remove existing functionality during the Lovable pilot correction phases. Any later removal of obsolete code requires review and remains recoverable through Git history.

---

## Phase 1 — Pilot safety, login, branding, truthful data labels

### 1.1 Remove public signup UI

- **Files:** `src/routes/login.tsx`, `src/lib/auth.tsx`
- **Visible impact:** No "Create one" CTA or signup form on `/login`. Sign-in only. Password reset (if it doesn't self-provision an account) may stay.
- **Logic impact:** `signUp` removed from `AuthState` and `AuthProvider`. No auth-config change; Supabase Auth settings are Phase 5.
- **Data source classification:** N/A (interface only).
- **Backend dependency:** None. Actually disabling sign-ups in Supabase Auth is a Phase 5 config task.
- **Security status:** Interface-only. Server sign-up endpoints remain reachable until Phase 5 disables them.
- **Risk:** L
- **Testing:** Manual — visit `/login`, confirm no signup entry; existing users still sign in. Typecheck passes.

### 1.2 Branding sweep to "GKHQ by RPM"

- **Files:** `src/routes/__root.tsx`, `src/routes/login.tsx`, `src/lib/mock-data.ts` (header comment), `README.md`, any file matching `RPM Hub`, `RPM Operations Platform`, `Refuel Performance Management` as a *product* label.
- **Visible impact:** Product name reads "GKHQ by RPM" everywhere. Legitimate RPM personnel, process (RPM7, mentor programme), and framework references remain untouched.
- **Logic impact:** None.
- **Data source classification:** N/A.
- **Backend dependency:** None.
- **Security status:** N/A.
- **Risk:** L
- **Testing:** `rg -n "RPM Hub|RPM Operations|Refuel Performance"` returns zero product-name hits. Visual check of login, header, 404.

### 1.3 Truthful data-source labels (applied by source, not by viewer)

- **Files:** new `src/lib/data-classification.ts` (exports `type Classification = 'live' | 'mock' | 'transitional' | 'unverified'` and a `<DataSourceBadge classification=...>` component); new `src/components/data-source-banner.tsx`; consumers — `src/routes/index.tsx`, `/goalkeepers.tsx`, `/goalkeepers.$gkId.tsx`, `/interactions.tsx`, `/reports.tsx`, `/media.tsx`, `/intelligence.tsx`, `/alerts.tsx`, `/calendar.tsx`, `/executive.tsx`, `/audit.tsx`, `/mentors.tsx`, `src/components/mentor/mentor-dashboard.tsx`.
- **Visible impact:** Every card/section rendered from mock seeds shows a small **Mock** badge; sections backed by Sheets show **Transitional**; sections whose source is unknown at implementation time show **Unverified**. Sections proven live show **Live** (or no badge, if the whole route is unambiguously live). All roles — including super_admin — see the same badges for the same records.
- **Logic impact:** Rendering only. Each consumer imports the badge and passes the classification of the record/section, resolved from a single central mapping that a reviewer can audit in one file.
- **Data source classification:** classifies everything else — this is the mechanism.
- **Backend dependency:** None.
- **Security status:** N/A.
- **Risk:** L
- **Testing:** Unit test the mapping — every route surface has an assigned classification. Manual walk: badges appear consistently regardless of who is signed in.

### 1.4 Honest match-report submission copy

- **Files:** `src/components/mentor/mentor-workflow.tsx` (submit step + result toast), `src/routes/reports.tsx` (banner), `src/lib/match-reports/reports.functions.ts` (return shape, see 3.2).
- **Visible impact:** Persistent banner: **"Match report submission uses a transitional Google Sheets connection. Successful persistence has not yet been verified in this environment."** The submit button label is unchanged; the *result* view no longer displays "Submitted" until the server function has returned a verified success signal (Phase 3.2 defines what verified means).
- **Logic impact:** Copy only in Phase 1; the success-state gating is wired in Phase 3.2.
- **Data source classification:** Transitional.
- **Backend dependency:** None (Phase 1).
- **Security status:** N/A.
- **Risk:** L
- **Testing:** Visual check of `/reports` and the submit dialog.

### 1.5 View-as clarity

- **Files:** `src/components/app-shell.tsx`
- **Visible impact:** View-as pill gains inline microcopy: "interface only — server permissions unchanged".
- **Logic impact:** None.
- **Data source classification:** N/A.
- **Backend dependency:** None.
- **Security status:** Reinforces that this is a UX affordance.
- **Risk:** L
- **Testing:** Manual — toggle view-as.

---

## Phase 2 — Mentor workflow, interaction terminology, removal of assignment language

### 2.1 Approved interaction-type vocabulary + Legacy handling

- **Files:** `src/lib/mock-data.ts` (`InteractionType` union), `src/routes/interactions.tsx`, `src/components/workflows.tsx` (Log Interaction dialog), `src/components/mentor/mentor-workflow.tsx`, `src/lib/mentor-domain.ts` (allowed-values comment).
- **Visible impact:** For NEW interactions, the picker offers exactly: Attend Match · Training Ground Visit · Coffee Meeting · Phone Call · Clip Upload · Match Report. For HISTORIC records whose stored `type` is an approved value, the label renders directly. For historic records with an ambiguous legacy value ("Video Review Session", "WhatsApp Feedback", "Development Meeting", "Scouting Assignment", "Live Match Observation", "Face to Face", and any other unrecognised string), the original string renders verbatim with a small **Legacy** badge and hover text "Legacy interaction pending review — not remapped."
- **Logic impact:** Only *exact equivalents* are remapped by a whitelist (empty by default; extend only when the user confirms a mapping is safe). No lossy inference. Report *categories* (Training Report, Recruitment Report, Opposition Goalkeeper Report, Development Report) remain in their own enum and are untouched.
- **Data source classification:** Mock (until the interaction table is confirmed in Phase 5).
- **Backend dependency:** None in Phase 2. Phase 5 will confirm whether an interactions table exists and, if so, its `interaction_type` domain.
- **Security status:** N/A.
- **Risk:** M (many call sites; strict "no invented history" contract).
- **Testing:** Unit test on the classifier — approved value → clean label; unknown value → verbatim + Legacy badge; whitelist mappings covered explicitly. Manual check across Interactions Log, dialog, mentor workflow.

### 2.2 Note / observation visibility (private / shared) — notes only

- **Files:** `src/lib/mentor-domain.ts` (add `visibility: 'private' | 'shared'` to mentor-note and observation shapes only — NOT to match-report shapes), `src/lib/mentor-session-store.ts`, `src/components/mentor/mentor-workflow.tsx` (toggle at note step), `src/components/handwritten-notes-field.tsx`, `src/routes/interactions.tsx` (badge + gating), and any note/observation surface in `reports.$reportId.tsx` (notes attached to a report, not the report body itself).
- **Visible impact:** Every note-capture UI has an explicit **Private / Shared** toggle, defaulting to **Private**. Note cards show a Private/Shared pill. In the client-side view, a note flagged Private renders as "Private note — hidden" for anyone other than the author, including mentor_manager. **Match reports themselves are treated as shared operational records — no whole-report visibility toggle in this phase.**
- **Logic impact:** Frontend gating only. Whole-report visibility (making an entire match report private) is **flagged as a product decision** for Rich and David — NOT implemented here. A short design note is captured in `docs/product-decisions.md` (new) to that effect.
- **Data source classification:** Mock (interface demo).
- **Backend dependency:** Real enforcement requires Phase 5 RLS on the interaction/observation table (once its existence is confirmed).
- **Security status:** **Not secure for real data.** UI gating only; anyone with backend access can still read notes until Phase 5 RLS lands.
- **Risk:** M (wrong default would look like a leak; default must be Private).
- **Testing:** Unit test on visibility helper covering author vs other user vs mentor_manager for both Private and Shared. Manual walk of every note surface.

### 2.3 Author-only edit rules (interface layer)

- **Files:** `src/lib/auth.tsx` (new record-scope permissions `interactions.edit.own`, `reports.edit.own`, `reports.edit.shared`), `src/components/require-permission.tsx` (add `canEditRecord(user, record)` helper), consumers in `src/routes/interactions.tsx`, `src/routes/reports.tsx`, `src/routes/reports.$reportId.tsx`, mentor workflow.
- **Visible impact:**
  - Standard mentor sees Edit only on their own interactions and reports.
  - Mentor_manager (David) sees Edit on any *shared submitted* report (whole reports are shared per 2.2); does not see Edit — or content — of any private note authored by someone else.
  - Admin (Rich) mirrors mentor_manager for reports.
  - Super_admin sees all Edits (interface).
- **Logic impact:** Record-scoped permission helper — role × author × visibility.
- **Data source classification:** Mock (drives interface behaviour over mock records; will apply to Live once Phase 5 completes).
- **Backend dependency:** Phase 5 must add matching RLS.
- **Security status:** **Interface-only. Not secure for real data.** Server functions must independently enforce identical rules — tracked as a Phase 5 dependency.
- **Risk:** M
- **Testing:** Unit tests for `canEditRecord` covering the full role × author × visibility matrix. Manual check across mentor and mentor_manager sessions.

### 2.4 Remove assignment language and clean up authorship terminology

- **Files:** `src/lib/mock-data.ts` (drop `Mentor.assignedGks`; drop `Goalkeeper.mentorId` — do NOT retain it under a renamed meaning; rename `Interaction.mentorId` → `authorId`; rename `Report.mentorId` → `submittedByUserId`), all consumers — `src/routes/goalkeepers.tsx`, `goalkeepers.$gkId.tsx`, `src/routes/mentors.tsx`, `src/routes/index.tsx`, `src/routes/calendar.tsx`, `src/routes/interactions.tsx`, `src/routes/reports.tsx`, `reports.$reportId.tsx`, `src/lib/mentor-domain.ts` (`PlayerAssignmentRow` comment removed).
- **Visible impact:** No "Assigned mentor", "Primary mentor", or per-mentor GK count. Goalkeeper profile shows a chronological list of interactions with the *author's* name. Mentors page becomes a collaborative directory.
- **Logic impact:** Authorship is stored under `authorId` / `submittedByUserId`; goalkeeper records carry no mentor link. Any code that previously read `goalkeeper.mentorId` is updated to derive "recent contacts" from the interactions list.
- **Data source classification:** Mock.
- **Backend dependency:** Phase 5 must confirm the production goalkeeper table has no assignment column, or explicitly document it.
- **Security status:** N/A (rename).
- **Risk:** M (broad rename; must be complete or typecheck fails — good).
- **Testing:** Typecheck; `rg -in "assignedGks|assign(ed)? mentor|primary mentor"` returns zero UI hits; manual walk of every listed route.

---

## Phase 3 — Seven-pillar match report interface and safe submission

### 3.1 Seven-pillar mapping table (single source of truth)

- **Files:** new `src/lib/match-reports/pillar-map.ts` (exports the mapping table below and is the ONLY place any of these names is defined); update `src/lib/match-reports/schema.ts` (label for the `psych` id becomes "Visible Psychological" — the underlying id stays `psych` to remain compatible with the current Sheet column layout and existing `match_reports_cache` column `psych`); consumers `src/routes/reports.tsx`, `src/routes/reports.$reportId.tsx`, `src/components/mentor/mentor-workflow.tsx`, any chart in `src/routes/intelligence.tsx`.
- **Mapping table** (locked; any new source of the same data must reuse this — no aliases like `visible_psych`, `ccic`, `speed_agility_athleticism` may appear elsewhere):

  | Application key | Production DB key (to be confirmed in Phase 5) | Google Sheet column | Visible label |
  |---|---|---|---|
  | `protect_goal` | `protect_goal` (unconfirmed) | Protect the Goal | Protect the Goal |
  | `protect_space` | `protect_space` (unconfirmed) | Protect the Space | Protect the Space |
  | `protect_air` | `protect_air` (unconfirmed) | Protect the Air | Protect the Air |
  | `control_play` | `control_play` (unconfirmed) | Control the Play | Control Play |
  | `change_play` | `change_play` (unconfirmed) | Change the Play | Change Play |
  | `psych` | `psych` (unconfirmed) | Courage / Control / Intelligent / Competitor | Visible Psychological |
  | `physical` | `physical` (unconfirmed) | Speed, Agility, Athleticism | Physical |

  The "Production DB key" column is marked unconfirmed until Phase 5 completes its schema inspection; the file includes a `// PHASE-5: verify against production DB` comment on that column.

- **Visible impact:** Every report — mock and Live — renders exactly seven pillar cards using the "Visible label" column above. Score entry accepts only whole numbers 1–5 (already enforced by `pillarScore` in `schema.ts`).
- **Logic impact:** Mock `Report.scores` shape realigned to seven ids (currently five). All read sites go through `pillar-map.ts`.
- **Data source classification:** Live (sheet-backed reports), Mock (seeded reports). Both must render seven pillars.
- **Backend dependency:** Phase 5 must confirm the production DB keys.
- **Security status:** N/A.
- **Risk:** M (many consumers of the old five-key shape).
- **Testing:** Vitest — extend the schema suite: valid seven-pillar payload accepted; payload missing any pillar rejected; non-integer / out-of-range values rejected. Manual: `/reports`, detail page, mentor workflow, intelligence chart.

### 3.2 Honest submit outcome — no pseudo-queue

- **Files:** `src/lib/match-reports/reports.functions.ts`, `src/lib/match-reports/sheets.server.ts` (surface real errors), `src/components/mentor/mentor-workflow.tsx` (result handling), `src/lib/match-reports/draft-store.ts` (already keeps the on-device draft; unchanged behaviour reused).
- **Visible impact:** On `appendRow` failure, the UI shows: **"Submission failed. This report has not been submitted to RPM. Your draft has been kept on this device — you can retry."** with a Retry button. No "Submitted" toast on failure. No "Queued" language.
- **Logic impact:** `submitMatchReport` returns `{ status: 'submitted', ... }` only when `appendRow` succeeds AND (Phase 3 addition) a read-back verification confirms the row is present. On failure it returns `{ status: 'failed', reason }` and does **not** write to `match_reports_cache`. The existing draft store retains the draft. **No durable server-side queue is created. `match_reports_cache` is not repurposed as a queue.**
- **Data source classification:** Transitional. Combined with the Phase 1.4 banner.
- **Backend dependency:** None. A real queue is a Phase 5 product decision.
- **Security status:** N/A.
- **Risk:** M — must not degrade the current happy path; verify successful path still shows "Submitted".
- **Testing:** Vitest — stub `appendRow` to succeed → status `submitted`, cache mirror occurs; stub `appendRow` to throw → status `failed`, cache mirror does NOT occur, draft still present. Manual: submit a report against a valid Sheet in a dev fixture; force a failure by breaking the connector key locally to observe the failed-state UI.

### 3.3 Report *categories* remain intact

- **Files:** `src/lib/mock-data.ts` (`ReportType` union).
- **Visible impact:** Report category chips remain: Training Report, Recruitment Report, Opposition Goalkeeper Report, Development Report, Match Report (label pass only where needed).
- **Logic impact:** Enum keys unchanged.
- **Data source classification:** Mock.
- **Backend dependency:** Phase 5 to confirm real production report-category taxonomy.
- **Security status:** N/A.
- **Risk:** L
- **Testing:** Visual on `/reports` filters.

---

## Phase 4 — Duty of care presentation without fabricated calculations

### 4.1 Retire the 21 / 35 / 36-day calculation

- **Files:** `src/lib/mock-data.ts` (`dutyStatusForGk`, `dutyStatusForMentor`, `dutyOverview` and consumers); `src/lib/notifications.tsx` (bell items keyed to duty transitions); `src/routes/alerts.tsx`, `/index.tsx`, `/goalkeepers.tsx`, `/goalkeepers.$gkId.tsx`, `/mentors.tsx`, `/executive.tsx`; `src/components/mentor/mentor-dashboard.tsx`; `src/components/primitives.tsx` (`DutyBadge`, `TrafficLight` retained as components — no longer wired to fabricated values).
- **Visible impact:** No red/amber/green traffic lights derived from days-since-last-contact anywhere.
- **Logic impact:** Fabricated derivations are unwired but the components remain callable, aligning with the change-management principle above (no destructive removal). A follow-up review may delete the dead helpers via Git.
- **Data source classification:** N/A (removing a fabricated calc).
- **Backend dependency:** None.
- **Security status:** N/A.
- **Risk:** M (broad set of consumers).
- **Testing:** `rg -n "dutyStatusForGk|dutyStatusForMentor|dutyOverview"` returns zero *call sites*. Typecheck passes.

### 4.2 Truthful duty-of-care placeholder

- **Files:** `src/components/primitives.tsx` (new `DutyOfCareState` — states: `not_enough_data`, `mock`, `live`); consumers listed in 4.1.
- **Visible impact:** Every previously duty-lit surface renders a neutral chip: **"Not enough data — awaiting tier history and qualifying interactions"**. Where a mock number is still shown for interface work, it is tagged **Mock** per Phase 1.3. No fabricated colour states. All roles, including super_admin, see the same states for the same records.
- **Logic impact:** Pure presentational placeholder. Real calculation is Phase 5.
- **Data source classification:** Mock or Unverified per surface.
- **Backend dependency:** None in Phase 4.
- **Security status:** N/A.
- **Risk:** L
- **Testing:** Manual walk of the affected surfaces; snapshot of the new component.

### 4.3 Remove mentor-owned duty rankings

- **Files:** `src/routes/mentors.tsx` (drop mentor monthly-completion bars); `src/routes/executive.tsx` (drop mentor leaderboard tied to fabricated completion — replace with "Metrics pending real data" card).
- **Visible impact:** Mentors page shows a collaborative directory. Executive shows no fabricated leaderboard.
- **Logic impact:** Fields may remain unread on the mock type.
- **Data source classification:** N/A.
- **Backend dependency:** None.
- **Security status:** N/A.
- **Risk:** L
- **Testing:** Manual check on both routes.

---

## Phase 5 — Codex / Cursor / DB / RLS / production integration (**not executed in this plan**)

Phase 5 does **not** assume any new tables in either Supabase project. Its first action is a read-only inspection of what already exists. Every subsequent step is *proposed*, subject to review, and additive-only where a gap is genuinely confirmed.

### 5.1 Production schema mapping (read-only, mandatory first step)

- **Scope:** In the production Supabase, catalogue (a) all tables, columns, and constraints; (b) all existing migrations; (c) all RLS policies and role grants; (d) all storage buckets and their policies; (e) all identifier conventions (primary keys, external ids, user id linkage); (f) existing structures for goalkeepers, mentors, interactions, observations, reports, tiers, and any assignment/authorship links.
- **Deliverable:** a written schema map — human-readable — that pins down which of the following exist and under what names: goalkeepers, tiers/tier history, interactions, observations, notes, match reports, seven-pillar columns, mentor/user identity, mentor↔goalkeeper linkage (if any), audit logs.
- **Backend dependency:** Read-only access. **No writes, no migrations, no schema changes.**
- **Security status:** N/A (read-only).
- **Risk:** L (inspection only).
- **Testing:** Peer review of the schema map.

### 5.2 Gap analysis vs pilot rules

- **Scope:** Compare the schema map from 5.1 against pilot needs: seven-pillar match reports (per 3.1 mapping table), mentor interaction types (per 2.1 approved list), note/observation visibility (per 2.2), authorship terminology (per 2.4), tier history (per 5.4), duty-of-care source data (per 4.2). Produce a written gap list, per subject area, marked "already covered", "covered but naming differs (propose alias in app, not DB)", or "genuine gap — additive migration proposed".
- **Backend dependency:** Read-only.
- **Security status:** N/A.
- **Risk:** L.
- **Testing:** Peer review.

### 5.3 RLS enforcement of Phase 2 interface rules (proposed, per gap)

- **Scope:** For each real table backing interactions, observations, notes, and match reports (as identified in 5.1), propose the minimal RLS policies that enforce:
  - author-only UPDATE/DELETE for standard mentors;
  - mentor_manager UPDATE on *shared submitted* match reports (rule from 2.3/2.2);
  - private/shared visibility on notes and observations, with author-always, others only when `visibility='shared'`, and mentor_manager NOT auto-granted read on private notes;
  - super_admin unrestricted;
  - authenticated-only read on caches such as `match_reports_cache`.
- **Backend dependency:** Additive policies on existing tables where they exist; no new tables unless 5.2 confirms a genuine gap.
- **Security status:** This is where Phase 2 becomes secure for real data — not before.
- **Risk:** H.
- **Testing:** Extend the `gk-media` RLS test pattern (`src/lib/storage/gk-media.test.ts`) to cover the interaction and match-report tables: anon denied; mentor A can edit own; mentor B cannot edit A's; mentor_manager can edit shared reports, cannot read A's private notes; super_admin allowed.

### 5.4 Tier history model (proposed, additive only if gap confirmed)

- **Scope:** If 5.1 shows no existing tier history, propose a `goalkeeper_tier_history` table with `goalkeeper_id`, `tier`, `effective_from`, `effective_to` (nullable), `changed_by_user_id`, `reason` / `notes`, and derive the current active tier from the row where `effective_to IS NULL`. Duty-of-care calculation must use the tier that was active during the reporting period, not the current tier.
- **Backend dependency:** Additive migration, subject to review, only if no existing structure meets the need.
- **Security status:** RLS: read by mentors/mentor_managers/admins/super_admin; write restricted to admin/super_admin (or an equivalent role identified in 5.1).
- **Risk:** M.
- **Testing:** SQL unit tests on the "active tier at date T" query; UI check that duty-of-care uses the historical tier.

### 5.5 Real duty-of-care calculation

- **Scope:** Once 5.4 lands and interactions are Live, replace the Phase 4.2 placeholder with a calculation over qualifying interaction types (per 2.1) within the reporting period, keyed off the tier active during that period. Definition of "qualifying" is a product input (Rich & David), not an engineering guess.
- **Backend dependency:** 5.1, 5.3, 5.4.
- **Security status:** Read-only view/RPC; RLS mirrors the underlying tables.
- **Risk:** M.
- **Testing:** SQL unit tests plus a UI smoke.

### 5.6 Persistent match-report submission (retire Sheets dependency)

- **Scope:** Wire `submitMatchReport` to write to the confirmed production match-report table using the mapping in 3.1. Retire the Sheets path once dual-run parity is verified. Only then may the Phase 1.4 transitional banner be removed and the Phase 3.2 failure UI be re-scoped.
- **Backend dependency:** 5.1 must confirm the production table and column names; 5.3 must supply RLS.
- **Security status:** RLS gates writes to authorised roles; the server function reads role from `user_roles` (not the client).
- **Risk:** M.
- **Testing:** Integration test on the server function against a staging schema copy; parity check between DB row and Sheet row during dual-run.

### 5.7 Disable public sign-ups in production Supabase

- **Scope:** Supabase Auth config toggle. Complements Phase 1.1.
- **Backend dependency:** Config change, not a migration.
- **Security status:** Removes the residual server-side sign-up surface.
- **Risk:** L.
- **Testing:** REST call to `signUp` returns disabled error.

### 5.8 Whole-report visibility — product decision, not implementation

- **Scope:** Rule 5 explicitly reserves whole-match-report visibility as a product decision. Phase 5 captures Rich & David's answer, then either (a) leaves match reports as shared operational records, or (b) proposes an additive `visibility` column on the reports table with RLS. Not implemented until decided.
- **Backend dependency:** None until decided.
- **Risk:** L (planning only).
- **Testing:** Written decision recorded in `docs/product-decisions.md`.

### 5.9 MCP disable-in-pilot toggle (source preserved)

- **Scope:** Introduce a `VITE_ENABLE_MCP` build flag consumed by `vite.config.ts` — when false, `mcpPlugin()` is not applied and `.mcp/*`, `/mcp`, `/.well-known/oauth-protected-resource` are absent from the build; when true, MCP works as today. `src/lib/mcp/**` and consent route stay intact. Reversible.
- **Backend dependency:** None. Validate that the plugin's own gating does not overwrite generated routes when disabled.
- **Security status:** Reduces attack surface during the pilot without removing source.
- **Risk:** M.
- **Testing:** Build with flag off — endpoints absent; build with flag on — MCP manifest still extracts cleanly.

### 5.10 Profile / authorship linkage

- **Scope:** Confirm the production `profiles` table (or equivalent) is populated for every real mentor account, and that `authorId` / `submittedByUserId` on real interaction/report rows resolves to a display name without relying on mock `mentors[]`.
- **Backend dependency:** Data audit on production.
- **Security status:** No policy change.
- **Risk:** M.
- **Testing:** Staging query.

---

## Cross-phase notes

- Do not destructively remove existing functionality during the Lovable pilot correction phases. Any later removal of obsolete code requires review and remains recoverable through Git history. Mock seeds, MCP source, and the Sheets integration all stay in the repo.
- Phase 2 and Phase 3 are the largest interface changes; both are safe to ship independently of Phase 5.
- Phases 1–4 make **no** claims about backend security. Every real-data claim depends on Phase 5.1 (schema map), 5.2 (gap analysis), and 5.3 (RLS).

Stopping here — no code, migration, database, storage, auth, or connector changes performed.
