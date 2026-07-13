
# Match Report System — Implementation Plan (schema locked)

_No code changes yet. Confirmed field list from you drives this plan._

## 1. Confirmed field list (source of truth)

| # | Field | Type | Notes |
|---|---|---|---|
| 1 | Goalkeeper | reference → goalkeepers | Search-picker, auto-fills club |
| 2 | Coach | reference → mentors | Auto-selected from signed-in user; editable by manager/admin |
| 3 | Team | reference → clubs | Prefilled from goalkeeper, editable |
| 4 | Opponent | reference → clubs (free-text allowed fallback) | |
| 5 | Match Date | date | Not in the future |
| 6 | Protect the Goal | integer 1–5 | RPM pillar |
| 7 | Protect the Space | integer 1–5 | RPM pillar |
| 8 | Protect the Air | integer 1–5 | RPM pillar |
| 9 | Control the Play | integer 1–5 | RPM pillar |
| 10 | Change the Play | integer 1–5 | RPM pillar |
| 11 | Courage / Control / Intelligent / Competitor | integer 1–5 | RPM pillar (Visible Psychological) |
| 12 | Speed, Agility and Athleticism | integer 1–5 | RPM pillar (Physical) |
| 13 | Comments | long text | Optional; voice-note transcription target |
| 14 | Average of scores | **calculated** | Computed server-side (`AVG(6..12)`, 1 dp) — not user-editable |

System-generated (not in the 14): `report_id`, `status`, `created_by_id`, `created_at`, `updated_at`, `version`.

## 2. Existing system audit (what changes)

- `src/lib/mock-data.ts` `Report.scores` (5-key `handling/distribution/aerial/oneVone/communication`) → **replaced** by the seven pillars above.
- `src/lib/mentor-domain.ts` `Rpm7Scores` (different seven keys) → **replaced**.
- `src/components/workflows.tsx` `ReportForm` (5 numeric inputs 0–10) → **rewritten** for 7 pillars 1–5, plus new fields (Team, Opponent, Match Date, Comments).
- `src/routes/reports.tsx` (list) and `src/routes/reports.$reportId.tsx` (detail iterates `scores` generically — safe) → both re-mapped to the new columns.
- Supabase tables today: `media_assets`, `media_audit_log`, `report_attachments`. No `match_reports` table exists — will be added. `report_attachments.report_id` stays `text`; new IDs are `MR-YYYYMMDD-<nano>`.
- Permissions: `withPermission("reports.view")` on `/reports` already in place; add `reports.submit` gate on the form CTA.

## 3. Recommended architecture

**Google Sheet = source of truth; Supabase = read cache + audit + attachments; TanStack server functions = the only writer.**

```text
Browser (mentor UI)
   │  useServerFn
   ▼
TanStack server fns   ──►  Google Sheets API v4  (source of truth)
   ├──►  Supabase: match_reports_cache   (fast reads, RLS)
   ├──►  Supabase: match_reports_audit   (append-only history)
   ├──►  Supabase: pending_report_writes (outbox on Sheet outage)
   └──►  Supabase: report_attachments    (existing)
```

## 4. Google Sheets connection — recommended method

**Primary: Lovable App Connector `google_sheets`** (workspace-owned, calls proxied through `connector-gateway.lovable.dev/google_sheets/v4/...`). One workspace-shared Sheet, no service-account key management, gateway handles token refresh, credentials never touch the browser.

Fallback: bare Google service account with JSON key stored via `add_secret` — only if the workspace can't use the connector.

Rejected: Apps Script Web App (weak auth, extra deploy surface); App User Connector (per-mentor OAuth is the wrong mode — this is shared workspace data); direct browser calls (would leak credentials).

Operations:

- **Read all** — `values:batchGet` on the `match_reports` tab + reference tabs; cached 60s per request.
- **Read one** — locate by `report_id` in the ID column, then `values.get` for that row.
- **Create** — `values:append` with `valueInputOption=USER_ENTERED`, `insertDataOption=INSERT_ROWS`; re-read to confirm.
- **Edit** — resolve row index by `report_id`; `values.update` on that exact range. Missing row → reject (never blind-insert).
- **Unique ID** — `MR-YYYYMMDD-<8char nano>`, server-generated, never reused.
- **Duplicate prevention** — server fn rejects create if `(goalkeeper_id, match_date, opponent_id)` already exists.
- **Empty/incomplete** — empty cells = `null`; row treated as `draft` unless required fields present.
- **History** — every write appends a row to `match_reports_audit` (before/after diff).
- **Sheet unavailable** — server fn catches non-2xx, writes payload to `pending_report_writes`, surfaces a banner "Saved locally — sync pending". A `/api/public/cron/sync-reports` route drains the outbox every 15 min.

## 5. Proposed data flow

1. Open form → `getMatchReport({ id? })` returns row + reference lists (goalkeepers, clubs, mentors).
2. Autosave every 5s while dirty + on blur → `saveMatchReportDraft` (status=`draft`).
3. Submit → Zod validate → `submitMatchReport` (status=`submitted`, compute Average, write Sheet, upsert cache, append audit).
4. `/reports` list reads `match_reports_cache`; `/reports/:id` reads cache; both never call Sheets directly on page load.
5. Cron reconciles Sheet → cache every 15 min so out-of-band Sheet edits are picked up.

## 6. Form sections (mobile/tablet-first)

1. **Match context** — Match Date, Team (prefilled), Opponent.
2. **Goalkeeper & Coach** — Goalkeeper picker (search); Coach = signed-in user (editable only for manager/admin).
3. **RPM pillar scores** — seven 1–5 steppers with pillar label + short hint; live "Average" display (read-only) updates as user scores.
4. **Comments** — long-form textarea + voice-note upload (routed through existing `transcribe.functions.ts`, fills Comments as editable suggestion).
5. **Attachments** — existing `report_attachments` flow, unchanged.
6. **Meta strip** — status pill, Save Draft / Submit / Cancel; `report_id`, timestamps visible when editing.

UX rules: required fields marked with `*`; inline validation on blur; unsaved-changes guard; tab order matches section order; keyboard-friendly 1–5 steppers.

## 7. Field mapping approach

- `src/lib/match-reports/schema.ts` — single source of truth. Each entry: `{ column_id, sheet_header, label, type, required, options?, section, min?, max? }`. Form, Zod validator, Sheet writer, and cache mirror all read from it.
- Stable `column_id` (snake_case) protects against header renames. Codex must keep the header row aligned with `column_id`s; renames in the Sheet only update `sheet_header`.
- Calculated: `average_score = round(mean(seven pillar scores), 1)` — computed in the server fn, written to the Sheet, mirrored to cache.

## 8. Validation rules

- Draft: Goalkeeper only.
- Submit: Goalkeeper, Coach, Team, Opponent, Match Date, all 7 pillar scores (1–5 integer), Comments optional.
- Match Date ≤ today.
- Pillar scores: `z.number().int().min(1).max(5)`.
- Comments ≤ 5000 chars.
- All rules enforced in Zod on both client (immediate feedback) and server (authoritative).

## 9. Supabase implications

New migrations (with GRANTs + RLS per project rules):

- `match_reports_cache(id, report_id UNIQUE, goalkeeper_id, coach_id, team, opponent, match_date, pg, ps, pa, cp, chp, psych, phys, average, comments, status, created_by_id, created_at, updated_at)` — `authenticated` SELECT; service_role write.
- `match_reports_audit(id, report_id, actor_id, actor_name, action, before jsonb, after jsonb, created_at)` — INSERT by authenticated (via server fn), SELECT for admins.
- `pending_report_writes(id, payload jsonb, attempts int, last_error, created_at)` — service_role only.
- Reference mirrors (optional but recommended): `goalkeepers`, `clubs`, `mentors` — reads from Sheet reference tabs and mirrored to Supabase for fast joins/dropdowns.

`report_attachments.report_id` remains text; new `MR-…` IDs are compatible.

## 10. Data model — flat vs reference

Hybrid. The Sheet keeps one flat `match_reports` tab, **but** Goalkeeper / Coach / Team / Opponent are IDs into reference tabs in the same Sheet (`goalkeepers`, `mentors`, `clubs`). This is what enables duplicate detection and clean joins, and prevents typos becoming new "clubs".

## 11. Security & permissions

- All writes via server fns with `.middleware([requireSupabaseAuth])`. `coach_id` defaults to `context.userId`; only `admin` / `mentor_manager` may override.
- Route gates: `/reports` behind `reports.view` (in place); form CTA behind `reports.submit`; edit an existing report allowed for author + manager/admin.
- Google credential lives server-side only (connector gateway or service-account secret).
- RLS on `match_reports_cache`: `authenticated` SELECT, service_role write.
- Audit row on every mutation with actor id/name/role.

## 12. Migration approach for existing reports

- Current reports are mock only — no production data. Mock kept behind a `USE_MOCK_REPORTS` dev flag; production reads from cache.
- Any residual `report_attachments` rows from mock use are orphaned; documented, cleared as part of go-live.

## 13. Implementation sequence

1. Confirm connector vs service account + Sheet URL/tab names.
2. Ship `src/lib/match-reports/schema.ts` (14-field mapping + Zod).
3. Migrations for cache/audit/outbox + reference mirrors.
4. Server fns: `listReports`, `getReport`, `saveDraft`, `submitReport`, `listReferences`, plus `/api/public/cron/sync-reports`.
5. Rewrite `ReportForm` in `src/components/workflows.tsx` against the new schema (7 pillars, live Average, autosave).
6. Rewrite `/reports` list + `/reports/:id` detail to consume cache and render 7 pillars.
7. Update mentor dashboard selectors (`selectRecentReports`) to the new shape; retire old `Rpm7Scores`.
8. Playwright: submit / edit / duplicate / Sheet-500 / permission-gate coverage across all four roles.

## 14. Risks & dependencies

- Google Sheets API quota (300 req/min/project) — cache + batch reads keep well under; autosave debounced to 5s.
- Header renames in Sheet break mapping unless `column_id` header row is preserved.
- Voice transcription latency — reuse existing `transcribe.functions.ts` but confirm it's fine for full match commentary (may be long).
- Cache/Sheet drift if the cron misses runs — mitigated by "read after write" confirmation.

## 15. Decisions needed before implementation

1. **Auth path:** App Connector `google_sheets` (recommended) or bare service-account secret?
2. **Sheet URL** + tab names for `match_reports`, `goalkeepers`, `clubs`, `mentors`.
3. **Coach override** — can `mentor_manager` / `admin` submit reports on another mentor's behalf?
4. **Edit window** — can a submitted report be edited freely, or does it require a manager to reopen?
5. **Opponent** — strict reference (existing clubs only) or free-text allowed with a "new club" prompt?
6. **Voice note transcription** — reuse existing `transcribe.functions.ts` or route through a different provider for match-length audio?
7. **Autosave cadence** — 5s debounce OK, or on blur only?
8. **Draft retention** — how long before drafts expire?

Confirm items 1–3 at minimum before implementation begins; the rest can be defaulted (App Connector, coach = self only, submitted reports editable by author for 24h then manager-only, opponent free-text with reference suggestion, existing transcription, 5s autosave, 30-day drafts) if you'd rather I proceed with sensible defaults.
