/**
 * localStorage-backed draft persistence for the Match Report form.
 *
 * - One draft per signed-in user (key: rpm.report-draft.v1.<userId>)
 * - Autosaved with a 5s debounce from ReportForm
 * - Discarded on successful submit or manual "Discard draft"
 * - 30-day retention: drafts older than that are dropped on load
 */
import type { PillarId } from "./schema";

export interface ReportDraft {
  goalkeeper: string;
  coach: string;
  team: string;
  opponent: string;
  matchDate: string;
  scores: Record<PillarId, number>;
  comments: string;
  selectedMedia: string[];
  savedAt: string; // ISO
}

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function keyFor(userId: string): string {
  return `rpm.report-draft.v1.${userId}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadDraft(userId: string): ReportDraft | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReportDraft;
    if (!parsed.savedAt) return null;
    if (Date.now() - new Date(parsed.savedAt).getTime() > RETENTION_MS) {
      window.localStorage.removeItem(keyFor(userId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(userId: string, draft: Omit<ReportDraft, "savedAt">): string {
  const savedAt = new Date().toISOString();
  if (!isBrowser()) return savedAt;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify({ ...draft, savedAt }));
  } catch {
    /* quota exceeded — ignore */
  }
  return savedAt;
}

export function clearDraft(userId: string): void {
  if (!isBrowser()) return;
  try { window.localStorage.removeItem(keyFor(userId)); } catch { /* ignore */ }
}

/** True if the draft has any meaningful user input beyond defaults. */
export function isDraftMeaningful(d: Omit<ReportDraft, "savedAt">): boolean {
  if (d.goalkeeper.trim() || d.team.trim() || d.opponent.trim() || d.comments.trim()) return true;
  if (d.selectedMedia.length > 0) return true;
  // Scores default to 3 across the board — flag as meaningful only if user changed any.
  return Object.values(d.scores).some((n) => n !== 3);
}
