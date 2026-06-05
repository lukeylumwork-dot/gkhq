import { useEffect, useMemo, useState, type ReactNode } from "react";
import { X, CheckCircle2, Upload, AlertCircle, Paperclip, Search } from "lucide-react";
import { goalkeepers, mentors } from "@/lib/mock-data";
import { useAuth, type SessionUser } from "@/lib/auth";
import {
  ACCEPT_BY_KIND, MAX_FILE_BYTES, detectKind, formatBytes, uploadMedia,
  updateMedia, listMedia, attachMediaToReport, RATING_TAG_OPTIONS,
  type MediaAsset, type MediaKind,
} from "@/lib/media-store";

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
  if (done) return <Submitted message="Interaction logged successfully." onDone={onDone} />;
  return (
    <form onSubmit={(e) => { e.preventDefault(); setDone(true); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Goalkeeper"><select className={selectCls} required defaultValue=""><option value="" disabled>Select…</option>{goalkeepers.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
        <Field label="Interaction Type"><select className={selectCls} required>{["Live Match", "Training Observation", "Face to Face", "Video Review", "Phone Call", "WhatsApp", "Other"].map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Date"><input type="date" className={inputCls} defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
        <Field label="Outcome"><select className={selectCls}>{["On track", "Above expectation", "Below expectation", "Needs follow-up", "Action plan agreed"].map((t) => <option key={t}>{t}</option>)}</select></Field>
      </div>
      <Field label="Notes"><textarea rows={4} className={taCls} placeholder="What did you observe?" required /></Field>
      <Field label="Follow-up Action"><input className={inputCls} placeholder="e.g. Schedule video review next week" /></Field>
      <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onDone} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button><button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">Save Interaction</button></div>
    </form>
  );
}

const REPORT_TYPES_FOR_ATTACH = new Set(["Training Report", "Match Report", "Recruitment"]);

function ReportForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const [scores, setScores] = useState({ handling: 7, distribution: 7, aerial: 7, oneVone: 7, communication: 7 });
  const [type, setType] = useState<string>("Training Report");
  const [gkId, setGkId] = useState<string>(goalkeepers[0]?.id ?? "");
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const types = user?.role === "scout"
    ? ["Recruitment", "Opposition GK", "Match Report"]
    : ["Goalkeeper Development", "Match Report", "Training Report", "Opposition GK", "Recruitment"];

  useEffect(() => { if (!types.includes(type)) setType(types[0]); }, [user]); // eslint-disable-line

  const allowAttach = REPORT_TYPES_FOR_ATTACH.has(type);

  if (done) return <Submitted message="Report submitted with attachments." onDone={onDone} />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Reports themselves are mock; we persist attachments under a generated id.
      const reportId = `r-new-${crypto.randomUUID()}`;
      if (selectedMedia.length) await attachMediaToReport(reportId, selectedMedia, user);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Report Type">
          <select className={selectCls} required value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Goalkeeper">
          <select className={selectCls} required value={gkId} onChange={(e) => setGkId(e.target.value)}>
            {goalkeepers.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
        <Field label="Date"><input type="date" className={inputCls} defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
        <Field label="Overall Rating (0–100)"><input type="number" min={0} max={100} defaultValue={75} className={inputCls} /></Field>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Structured Scoring (0–10)</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(scores).map(([k, v]) => (
            <div key={k}>
              <label className="text-[10px] text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</label>
              <input type="number" min={0} max={10} value={v} onChange={(e) => setScores({ ...scores, [k]: Number(e.target.value) })} className={inputCls} />
            </div>
          ))}
        </div>
      </div>
      <Field label="Written Observations"><textarea rows={5} className={taCls} placeholder="Summary, key moments, strengths, areas to develop…" required /></Field>

      {allowAttach && (
        <MediaAttachPicker
          gkId={gkId}
          selected={selectedMedia}
          onChange={setSelectedMedia}
          user={user}
        />
      )}

      {error && <div className="text-xs text-red-400">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className="h-9 px-3 rounded-md border border-border text-sm" disabled={submitting}>Cancel</button>
        <button type="submit" disabled={submitting} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
          {submitting ? "Submitting…" : "Submit Report"}
        </button>
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

  const allowedGks = useMemo(() => {
    if (user?.role === "mentor" && user.mentorId) {
      return goalkeepers.filter((g) => g.mentorId === user.mentorId);
    }
    return goalkeepers;
  }, [user]);

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

  const allowedGks = useMemo(() => {
    if (user?.role === "mentor" && user.mentorId) {
      return goalkeepers.filter((g) => g.mentorId === user.mentorId);
    }
    return goalkeepers;
  }, [user]);

  if (done) return <Submitted message="Media updated." onDone={onDone} />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (user?.role === "mentor" && !allowedGks.find((g) => g.id === gkId)) {
      setError("Mentors can only link media to their assigned goalkeepers.");
      return;
    }
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
        <Field label="Assign Mentor"><select className={selectCls}><option value="">— Unassigned —</option>{mentors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
        <Field label="Contract Until"><input type="date" className={inputCls} /></Field>
        <Field label="Recommendation"><select className={selectCls}>{["Monitor", "Sign", "Loan", "Develop", "Retain", "Pass"].map((t) => <option key={t}>{t}</option>)}</select></Field>
      </div>
      <Field label="Initial Scouting Notes"><textarea rows={4} className={taCls} placeholder="Profile summary, source, context…" /></Field>
      <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onDone} className="h-9 px-3 rounded-md border border-border text-sm">Cancel</button><button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">Add Goalkeeper</button></div>
    </form>
  );
}
