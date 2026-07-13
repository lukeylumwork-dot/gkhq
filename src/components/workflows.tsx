import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, CheckCircle2, Upload, AlertCircle, Paperclip, Search, Trash2 } from "lucide-react";
import { goalkeepers, mentors } from "@/lib/mock-data";
import { useAuth, type SessionUser } from "@/lib/auth";
import {
  ACCEPT_BY_KIND, MAX_FILE_BYTES, detectKind, formatBytes, uploadMedia,
  updateMedia, listMedia, attachMediaToReport, RATING_TAG_OPTIONS,
  type MediaAsset, type MediaKind,
} from "@/lib/media-store";
import { HandwrittenNotesField } from "@/components/handwritten-notes-field";
import { submitMatchReport } from "@/lib/match-reports/reports.functions";
import {
  PILLAR_IDS, PILLAR_LABELS, averageOfScores, type PillarId,
} from "@/lib/match-reports/schema";
import {
  loadDraft, saveDraft, overwriteDraft, clearDraft, isDraftMeaningful,
  subscribeDraftChanges, newTabId,
  type ReportDraft, type ReportDraftSnapshot,
} from "@/lib/match-reports/draft-store";

function formatDraftTime(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return sameDay ? t : `${d.toLocaleDateString()} ${t}`;
  } catch { return iso; }
}

export type WorkflowKind = "interaction" | "report" | "media" | "goalkeeper";

const TITLES: Record<WorkflowKind, string> = {
  interaction: "Log Interaction",
  report: "Submit Report",
  media: "Upload Media",
  goalkeeper: "Add Goalkeeper",
};

export function WorkflowDialog({ kind, onClose }: { kind: WorkflowKind | null; onClose: () => void }) {
  if (!kind) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-card border border-border rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div>
            <h3 className="text-base font-semibold">{TITLES[kind]}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {kind === "media" || kind === "report" ? "Stored in Lovable Cloud" : "Saved locally to this session"}
            </p>
          </div>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-md hover:bg-accent"><X className="size-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto">
          {kind === "interaction" && <InteractionForm onDone={onClose} />}
          {kind === "report" && <ReportForm onDone={onClose} />}
          {kind === "media" && <MediaForm onDone={onClose} />}
          {kind === "goalkeeper" && <GoalkeeperForm onDone={onClose} />}
        </div>
      </div>
    </div>
  );
}

export function EditMediaDialog({ asset, onClose }: { asset: MediaAsset | null; onClose: () => void }) {
  if (!asset) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-card border border-border rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div>
            <h3 className="text-base font-semibold">Edit Media</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Update metadata, tags or the linked goalkeeper.</p>
          </div>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-md hover:bg-accent"><X className="size-4" /></button>
        </div>
        <div className="p-5">
          <EditMediaForm asset={asset} onDone={onClose} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
const inputCls = "w-full h-9 px-3 rounded-md bg-input/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40";
const selectCls = inputCls;
const taCls = "w-full px-3 py-2 rounded-md bg-input/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 resize-none";

function Submitted({ message, onDone }: { message: string; onDone: () => void }) {
  return (
    <div className="text-center py-6">
      <CheckCircle2 className="size-10 text-primary mx-auto" />
      <p className="text-sm font-medium mt-3">{message}</p>
      <button onClick={onDone} className="mt-4 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">Close</button>
    </div>
  );
}

function TagPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {RATING_TAG_OPTIONS.map((t) => {
        const active = value.includes(t);
        return (
          <button key={t} type="button" onClick={() => onChange(active ? value.filter((x) => x !== t) : [...value, t])}
            className={`px-2 py-0.5 rounded text-[10px] border ${active ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:bg-accent/40"}`}>
            {t}
          </button>
        );
      })}
    </div>
  );
}

function InteractionForm({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState("");
  const [gkId, setGkId] = useState("");
  const gk = goalkeepers.find((g) => g.id === gkId);
  if (done) return <Submitted message="Interaction logged successfully." onDone={onDone} />;
  return (
    <form onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Goalkeeper"><select className={selectCls} required value={gkId} onChange={(e) => setGkId(e.target.value)}><option value="" disabled>Select…</option>{goalkeepers.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
        <Field label="Interaction Type"><select className={selectCls} required>{["Live Match Observation", "Training Ground Visit", "Face to Face", "Video Review Session", "Phone Call", "WhatsApp Feedback", "Development Meeting", "Scouting Assignment"].map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Date"><input type="date" className={inputCls} defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
        <Field label="Outcome"><select className={selectCls}>{["On track", "Above expectation", "Below expectation", "Needs follow-up", "Action plan agreed"].map((t) => <option key={t}>{t}</option>)}</select></Field>
      </div>
      <HandwrittenNotesField
        context={gk ? `Session notes about ${gk.name} (${gk.club})` : undefined}
        onTranscribed={(text, mode) => setNotes((prev) => mode === "replace" || !prev.trim() ? text : `${prev.trim()}\n\n${text}`)}
      />
      <Field label="Notes"><textarea rows={5} className={taCls} placeholder="What did you observe? Or use the camera above to transcribe handwritten notes." required value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Field label="Follow-up Action"><input className={inputCls} placeholder="e.g. Schedule video review next week" /></Field>
      <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onDone} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button><button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save Interaction</button></div>
    </form>
  );
}

/**
 * Match Report form — writes to the RPM Match Reports Google Sheet via
 * a server function. Fields locked to the confirmed 14-column schema.
 */
function ReportForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const submitFn = useServerFn(submitMatchReport);

  const canOverrideCoach = !!user && (user.role === "super_admin" || user.role === "admin" || user.role === "mentor_manager");

  const [done, setDone] = useState<{ report_id: string; average: number } | null>(null);
  const [goalkeeper, setGoalkeeper] = useState("");
  const [coach, setCoach] = useState(user?.name ?? "");
  const [team, setTeam] = useState("");
  const [opponent, setOpponent] = useState("");
  const [matchDate, setMatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [scores, setScores] = useState<Record<PillarId, number>>({
    protect_goal: 3, protect_space: 3, protect_air: 3,
    control_play: 3, change_play: 3, psych: 3, physical: 3,
  });
  const [comments, setComments] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Keep coach field synced with the signed-in user (non-managers only).
  useEffect(() => {
    if (!canOverrideCoach && user?.name) setCoach(user.name);
  }, [canOverrideCoach, user?.name]);

  // ---------------- Draft persistence + versioning (localStorage) ----------------
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftRestoredFrom, setDraftRestoredFrom] = useState<string | null>(null);
  const tabIdRef = useRef<string>("");
  if (!tabIdRef.current) tabIdRef.current = newTabId();
  const localVersionRef = useRef<number>(0);
  const [conflict, setConflict] = useState<ReportDraft | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSnapshot = (): ReportDraftSnapshot => ({
    goalkeeper, coach, team, opponent, matchDate, scores, comments, selectedMedia,
  });

  const applySnapshot = (d: ReportDraftSnapshot) => {
    setGoalkeeper(d.goalkeeper);
    if (canOverrideCoach) setCoach(d.coach);
    setTeam(d.team);
    setOpponent(d.opponent);
    if (d.matchDate) setMatchDate(d.matchDate);
    setScores(d.scores);
    setComments(d.comments);
    setSelectedMedia(d.selectedMedia);
  };

  // Restore on mount.
  useEffect(() => {
    if (!user) return;
    const d = loadDraft(user.id);
    if (d) {
      applySnapshot(d);
      localVersionRef.current = d.version;
      setDraftSavedAt(d.savedAt);
      setDraftRestoredFrom(d.savedAt);
    }
    setDraftLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Cross-tab watcher: another tab wrote to the same draft slot.
  useEffect(() => {
    if (!user) return;
    return subscribeDraftChanges(user.id, (remote) => {
      if (!remote) return; // remote cleared (submit/discard elsewhere)
      if (remote.tabId === tabIdRef.current) return; // our own write echoed
      if (remote.version <= localVersionRef.current) return; // stale
      // Only raise conflict if our unsaved snapshot actually differs.
      const mine = currentSnapshot();
      const differs =
        mine.goalkeeper !== remote.goalkeeper ||
        mine.coach !== remote.coach ||
        mine.team !== remote.team ||
        mine.opponent !== remote.opponent ||
        mine.matchDate !== remote.matchDate ||
        mine.comments !== remote.comments ||
        JSON.stringify(mine.scores) !== JSON.stringify(remote.scores) ||
        JSON.stringify(mine.selectedMedia) !== JSON.stringify(remote.selectedMedia);
      if (differs) setConflict(remote);
      else {
        // No local divergence — silently fast-forward.
        localVersionRef.current = remote.version;
        setDraftSavedAt(remote.savedAt);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Autosave (debounced 5s). Blocked while a conflict is pending.
  useEffect(() => {
    if (!user || !draftLoaded || done || conflict) return;
    const snapshot = currentSnapshot();
    if (!isDraftMeaningful(snapshot)) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const res = saveDraft(user.id, tabIdRef.current, localVersionRef.current, snapshot);
      if (res.ok) {
        localVersionRef.current = res.version;
        setDraftSavedAt(res.savedAt);
      } else {
        setConflict(res.conflict);
      }
    }, 5000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [user, draftLoaded, done, conflict, goalkeeper, coach, team, opponent, matchDate, scores, comments, selectedMedia]);

  const discardDraft = () => {
    if (!user) return;
    clearDraft(user.id);
    setGoalkeeper("");
    if (canOverrideCoach) setCoach(user.name);
    setTeam("");
    setOpponent("");
    setMatchDate(new Date().toISOString().slice(0, 10));
    setScores({
      protect_goal: 3, protect_space: 3, protect_air: 3,
      control_play: 3, change_play: 3, psych: 3, physical: 3,
    });
    setComments("");
    setSelectedMedia([]);
    setDraftSavedAt(null);
    setDraftRestoredFrom(null);
    localVersionRef.current = 0;
    setConflict(null);
  };

  // Conflict resolution actions.
  const keepMine = () => {
    if (!user || !conflict) return;
    const res = overwriteDraft(user.id, tabIdRef.current, currentSnapshot());
    localVersionRef.current = res.version;
    setDraftSavedAt(res.savedAt);
    setConflict(null);
  };
  const useTheirs = () => {
    if (!conflict) return;
    applySnapshot(conflict);
    localVersionRef.current = conflict.version;
    setDraftSavedAt(conflict.savedAt);
    setDraftRestoredFrom(conflict.savedAt);
    setConflict(null);
  };

  const liveAverage = useMemo(() => averageOfScores(scores), [scores]);

  if (done) {
    return (
      <Submitted
        message={`Match report saved to Google Sheet · Average ${done.average.toFixed(1)}`}
        onDone={onDone}
      />
    );
  }

  const setScore = (id: PillarId, v: number) =>
    setScores((s) => ({ ...s, [id]: Math.max(1, Math.min(5, Math.round(v))) }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setError("You must be signed in."); return; }
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await submitFn({
        data: {
          actor: { id: user.id, name: user.name, role: user.role },
          payload: {
            goalkeeper: goalkeeper.trim(),
            coach: coach.trim(),
            team: team.trim(),
            opponent: opponent.trim(),
            match_date: matchDate,
            ...scores,
            comments: comments.trim(),
          },
        },
      });

      // Attach any media picked while composing.
      if (selectedMedia.length) {
        try { await attachMediaToReport(res.report_id, selectedMedia, user); }
        catch (mErr) { console.error("[report] attach media failed:", mErr); }
      }
      window.dispatchEvent(new CustomEvent("rpm:report-submitted"));
      clearDraft(user.id);
      setDraftSavedAt(null);
      setDraftRestoredFrom(null);
      setDone({ report_id: res.report_id, average: res.average });
    } catch (err) {
      // Zod errors from the server come back stringified; surface plainly.
      const msg = err instanceof Error ? err.message : "Could not submit report.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Goalkeeper *">
          <input className={inputCls} required list="mr-gk-suggestions" value={goalkeeper}
            onChange={(e) => setGoalkeeper(e.target.value)}
            placeholder="e.g. James Beadle" maxLength={80} />
          <datalist id="mr-gk-suggestions">
            {goalkeepers.map((g) => <option key={g.id} value={g.name} />)}
          </datalist>
        </Field>
        <Field label={`Coach *${canOverrideCoach ? "" : " (you)"}`}>
          <input className={inputCls} required value={coach} disabled={!canOverrideCoach}
            list="mr-coach-suggestions"
            onChange={(e) => setCoach(e.target.value)} maxLength={80} />
          <datalist id="mr-coach-suggestions">
            {mentors.map((m) => <option key={m.id} value={m.name} />)}
          </datalist>
        </Field>
        <Field label="Team *">
          <input className={inputCls} required value={team} onChange={(e) => setTeam(e.target.value)}
            placeholder="e.g. England U21" maxLength={80} />
        </Field>
        <Field label="Opponent *">
          <input className={inputCls} required value={opponent} onChange={(e) => setOpponent(e.target.value)}
            placeholder="e.g. Moldova" maxLength={80} />
        </Field>
        <Field label="Match Date *">
          <input type="date" className={inputCls} required value={matchDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setMatchDate(e.target.value)} />
        </Field>
        <Field label="Average of scores">
          <div className="h-9 px-3 rounded-md border border-border/60 bg-muted/40 flex items-center text-sm font-semibold tabular-nums">
            {liveAverage.toFixed(1)}
          </div>
        </Field>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            RPM Pillar Scores (1–5)
          </div>
          <div className="text-[10px] text-muted-foreground">1 = poor · 5 = excellent</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PILLAR_IDS.map((id) => (
            <div key={id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border/60 bg-input/40">
              <label className="text-xs text-foreground/90 leading-tight">{PILLAR_LABELS[id]}</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = scores[id] === n;
                  return (
                    <button key={n} type="button" onClick={() => setScore(id, n)}
                      className={`size-7 rounded text-xs font-semibold tabular-nums transition-colors ${
                        active ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground hover:bg-accent/40"
                      }`}>{n}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <HandwrittenNotesField
        context={goalkeeper ? `Match notes on ${goalkeeper} vs ${opponent || "opponent"}` : undefined}
        onTranscribed={(text, mode) =>
          setComments((prev) => (mode === "replace" || !prev.trim() ? text : `${prev.trim()}\n\n${text}`))
        }
      />
      <Field label="Comments">
        <textarea rows={5} className={taCls} value={comments}
          onChange={(e) => setComments(e.target.value)} maxLength={5000}
          placeholder="What did you see? Key moments, strengths, areas to develop…" />
      </Field>

      <MediaAttachPicker
        gkId={goalkeepers.find((g) => g.name === goalkeeper)?.id ?? ""}
        selected={selectedMedia}
        onChange={setSelectedMedia}
        user={user}
      />

      {error && <div className="text-xs text-destructive flex items-start gap-1.5"><AlertCircle className="size-3.5 mt-0.5" />{error}</div>}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
        <div className="text-[11px] text-muted-foreground flex items-center gap-2 min-h-6">
          {draftRestoredFrom && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/40 text-foreground/80">
              Draft restored from {formatDraftTime(draftRestoredFrom)}
            </span>
          )}
          {draftSavedAt ? (
            <span>Draft saved · {formatDraftTime(draftSavedAt)}</span>
          ) : draftLoaded ? (
            <span className="opacity-60">Autosaves every 5s</span>
          ) : null}
          {draftSavedAt && (
            <button type="button" onClick={discardDraft} disabled={submitting}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3" /> Discard draft
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onDone} className="h-9 px-3 rounded-md border border-border text-sm" disabled={submitting}>Cancel</button>
          <button type="submit" disabled={submitting} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
            {submitting ? "Saving to Sheet…" : "Submit Match Report"}
          </button>
        </div>
      </div>
    </form>
  );
}

function MediaAttachPicker({
  gkId, selected, onChange, user,
}: {
  gkId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  user: SessionUser | null;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setAssets(await listMedia({ gkId })); } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [gkId]); // eslint-disable-line

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return assets;
    return assets.filter((a) => a.title.toLowerCase().includes(s) || (a.notes ?? "").toLowerCase().includes(s));
  }, [assets, search]);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="space-y-2 border border-border rounded-md p-3 bg-background/40">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium inline-flex items-center gap-1.5">
          <Paperclip className="size-3.5" />Attach Media {selected.length > 0 && <span className="text-primary normal-case">· {selected.length} selected</span>}
        </div>
        {user && (
          <button type="button" onClick={() => setShowUpload((v) => !v)} className="text-[11px] text-primary hover:underline">
            {showUpload ? "Cancel upload" : "Upload new"}
          </button>
        )}
      </div>

      {showUpload && user && (
        <InlineUploader gkId={gkId} user={user} onUploaded={async (asset) => {
          await load();
          onChange([...selected, asset.id]);
          setShowUpload(false);
        }} />
      )}

      <div className="relative">
        <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search existing media for this goalkeeper…" className="w-full h-8 pl-7 pr-2 rounded-md bg-input/60 border border-border text-xs" />
      </div>

      <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
        {loading ? (
          <div className="text-xs text-muted-foreground py-2">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2">No existing media for this goalkeeper.</div>
        ) : filtered.map((a) => {
          const active = selected.includes(a.id);
          return (
            <label key={a.id} className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs cursor-pointer ${active ? "border-primary/40 bg-primary/10" : "border-border hover:bg-accent/30"}`}>
              <input type="checkbox" checked={active} onChange={() => toggle(a.id)} className="size-3.5" />
              <span className="flex-1 truncate">{a.title}</span>
              <span className="text-[10px] text-muted-foreground uppercase">{a.media_type}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function InlineUploader({ gkId, user, onUploaded }: { gkId: string; user: SessionUser; onUploaded: (a: MediaAsset) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const onPick = async (file: File | null) => {
    if (!file) return;
    setErr(null);
    const kind = detectKind(file);
    if (!kind) { setErr("Unsupported file type."); return; }
    if (file.size > MAX_FILE_BYTES) { setErr(`File exceeds ${formatBytes(MAX_FILE_BYTES)}.`); return; }
    setBusy(true);
    try {
      const asset = await uploadMedia({ file, gkId, title: file.name.replace(/\.[^.]+$/, ""), kind, user });
      window.dispatchEvent(new CustomEvent("rpm:media-uploaded"));
      onUploaded(asset);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally { setBusy(false); }
  };
  return (
    <div className="border border-dashed border-border rounded-md p-2 text-xs flex items-center gap-2">
      <label className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-1 rounded bg-primary text-primary-foreground">
        <Upload className="size-3" />{busy ? "Uploading…" : "Choose file"}
        <input type="file" className="hidden" disabled={busy} onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      </label>
      <span className="text-muted-foreground">Up to {formatBytes(MAX_FILE_BYTES)} · video/image/PDF/audio</span>
      {err && <span className="text-red-400 ml-auto">{err}</span>}
    </div>
  );
}

const KIND_LABELS: { value: MediaKind; label: string }[] = [
  { value: "video", label: "Video clip" },
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Image" },
  { value: "audio", label: "Voice note" },
];

function MediaForm({ onDone }: { onDone: () => void }) {
  const { user, can } = useAuth();
  const [done, setDone] = useState(false);
  const [kind, setKind] = useState<MediaKind>("video");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [gkId, setGkId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mentors work collaboratively — any mentor can link media to any goalkeeper.
  const allowedGks = useMemo(() => goalkeepers, []);

  if (!user || !can("media.upload")) {
    return (
      <div className="text-sm text-muted-foreground flex items-start gap-2 p-2">
        <AlertCircle className="size-4 text-amber-400 mt-0.5" />
        <span>Your role doesn't have permission to upload media. Contact an admin.</span>
      </div>
    );
  }

  if (done) return <Submitted message="Media uploaded and linked to the goalkeeper." onDone={onDone} />;

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) { setFile(null); return; }
    if (f.size > MAX_FILE_BYTES) { setError(`File is ${formatBytes(f.size)} — limit is ${formatBytes(MAX_FILE_BYTES)}.`); return; }
    const detected = detectKind(f);
    if (detected) setKind(detected);
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) { setError("Please choose a file to upload."); return; }
    if (!gkId) { setError("Please select a goalkeeper."); return; }
    setBusy(true);
    try {
      await uploadMedia({ file, gkId, title: title.trim() || file.name, notes, kind, ratingTags: tags, user });
      window.dispatchEvent(new CustomEvent("rpm:media-uploaded"));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Media Type">
          <select className={selectCls} value={kind} onChange={(e) => setKind(e.target.value as MediaKind)}>
            {KIND_LABELS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </Field>
        <Field label="Linked Goalkeeper">
          <select className={selectCls} required value={gkId} onChange={(e) => setGkId(e.target.value)}>
            <option value="" disabled>Select…</option>
            {allowedGks.map((g) => <option key={g.id} value={g.id}>{g.name} — {g.club}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Title">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Match clip vs derby — 2nd half" required />
      </Field>
      <Field label="File">
        <label className="flex flex-col items-center justify-center gap-1.5 h-32 rounded-md border-2 border-dashed border-border hover:border-primary/40 cursor-pointer bg-input/30 px-4 text-center">
          {file ? (
            <>
              <Upload className="size-5 text-primary" />
              <span className="text-sm font-medium truncate max-w-full">{file.name}</span>
              <span className="text-[11px] text-muted-foreground">{formatBytes(file.size)} · {file.type || "unknown type"}</span>
            </>
          ) : (
            <>
              <Upload className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">Click to select a file</span>
              <span className="text-[11px] text-muted-foreground">Up to 200MB · video, audio, image or PDF</span>
            </>
          )}
          <input type="file" className="hidden" accept={ACCEPT_BY_KIND[kind]} onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
        </label>
      </Field>
      <Field label="Rating Tags"><TagPicker value={tags} onChange={setTags} /></Field>
      <Field label="Notes"><textarea rows={3} className={taCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context for reviewers…" /></Field>
      {error && (
        <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className="h-9 px-3 rounded-md border border-border text-sm" disabled={busy}>Cancel</button>
        <button type="submit" disabled={busy} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>
    </form>
  );
}

function EditMediaForm({ asset, onDone }: { asset: MediaAsset; onDone: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState(asset.title);
  const [notes, setNotes] = useState(asset.notes ?? "");
  const [kind, setKind] = useState<MediaKind>(asset.media_type);
  const [gkId, setGkId] = useState(asset.gk_id);
  const [tags, setTags] = useState<string[]>(asset.rating_tags);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Mentors work collaboratively — any mentor can link media to any goalkeeper.
  const allowedGks = useMemo(() => goalkeepers, []);

  if (done) return <Submitted message="Media updated." onDone={onDone} />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await updateMedia(asset.id, { title: title.trim(), notes: notes || null, media_type: kind, gk_id: gkId, rating_tags: tags }, user, asset);
      window.dispatchEvent(new CustomEvent("rpm:media-updated"));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Title"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Media Type">
          <select className={selectCls} value={kind} onChange={(e) => setKind(e.target.value as MediaKind)}>
            {KIND_LABELS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </Field>
        <Field label="Linked Goalkeeper">
          <select className={selectCls} value={gkId} onChange={(e) => setGkId(e.target.value)}>
            {allowedGks.map((g) => <option key={g.id} value={g.id}>{g.name} — {g.club}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Rating Tags"><TagPicker value={tags} onChange={setTags} /></Field>
      <Field label="Notes"><textarea rows={3} className={taCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className="h-9 px-3 rounded-md border border-border text-sm" disabled={busy}>Cancel</button>
        <button type="submit" disabled={busy} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function GoalkeeperForm({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(false);
  if (done) return <Submitted message="Goalkeeper added to the database." onDone={onDone} />;
  return (
    <form onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full Name"><input className={inputCls} placeholder="e.g. Aiden Walsh" required /></Field>
        <Field label="Date of Birth"><input type="date" className={inputCls} /></Field>
        <Field label="Nationality"><input className={inputCls} placeholder="e.g. Ireland" /></Field>
        <Field label="Club"><input className={inputCls} placeholder="e.g. Shamrock Rovers" /></Field>
        <Field label="League"><input className={inputCls} placeholder="e.g. League of Ireland" /></Field>
        <Field label="Height"><input className={inputCls} placeholder="e.g. 192cm" /></Field>
        <Field label="Status"><select className={selectCls}>{["Prospect", "Development", "First Team", "Elite", "Free Agent"].map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Contract Until"><input type="date" className={inputCls} /></Field>
        <Field label="Recommendation"><select className={selectCls}>{["Monitor", "Sign", "Loan", "Develop", "Retain", "Pass"].map((t) => <option key={t}>{t}</option>)}</select></Field>
      </div>
      <Field label="Initial Scouting Notes"><textarea rows={4} className={taCls} placeholder="Profile summary, source, context…" /></Field>
      <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onDone} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button><button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">Add Goalkeeper</button></div>
    </form>
  );
}
