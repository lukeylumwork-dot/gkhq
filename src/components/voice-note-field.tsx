import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, Square, Loader2, X, RotateCcw, Sparkles, CheckCircle2, AlertTriangle, History, XCircle } from "lucide-react";
import { toast } from "sonner";
import { transcribeVoiceNote } from "@/lib/api/transcribe.functions";


const MAX_SECONDS = 180;

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read audio"));
    r.readAsDataURL(blob);
  });
}

interface VoiceDraft {
  transcript: string;
  tokens: Array<{ token: string; confidence: number }>;
  avgConfidence: number | null;
  reviewed: boolean;
}

interface AttemptLogEntry {
  id: string;
  timestamp: number;
  status: "started" | "success" | "error";
  message?: string;
}

interface Props {
  onTranscribed: (text: string, mode: "replace" | "append") => void;
  onAudioAttach?: (audio: { blob: Blob; mimeType: string; durationSec: number }) => void | Promise<void>;
  draft?: VoiceDraft | null;
  onDraftChange?: (draft: VoiceDraft | null) => void;
  className?: string;
}

type Phase = "idle" | "preparing" | "uploading" | "transcribing";

export function VoiceNoteField({ onTranscribed, onAudioAttach, draft, onDraftChange, className }: Props) {
  const [recording, setRecording] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(draft?.transcript ?? null);
  const [tokens, setTokens] = useState<Array<{ token: string; confidence: number }>>(draft?.tokens ?? []);
  const [avgConfidence, setAvgConfidence] = useState<number | null>(draft?.avgConfidence ?? null);
  const [reviewed, setReviewed] = useState<boolean>(draft?.reviewed ?? false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [attemptLog, setAttemptLog] = useState<AttemptLogEntry[]>([]);
  const [cancelled, setCancelled] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [retryAvailableAt, setRetryAvailableAt] = useState<number>(0);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [restoredFromDraft, setRestoredFromDraft] = useState<boolean>(!!draft?.transcript);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const dataUrlRef = useRef<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const mimeRef = useRef<string>("audio/webm");
  const durationRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const preTranscribeSnapshotRef = useRef<VoiceDraft | null>(null);
  const cancelledPhaseRef = useRef<Phase>("idle");
  const cancelledElapsedRef = useRef<number>(0);
  const [attached, setAttached] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const run = useServerFn(transcribeVoiceNote);
  const busy = phase !== "idle";

  const clearPhaseTimer = () => {
    if (phaseTimerRef.current) { clearInterval(phaseTimerRef.current); phaseTimerRef.current = null; }
  };

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => () => {
    cleanupStream();
    clearPhaseTimer();
    abortRef.current?.abort();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  // Sync transcript/review state up into the parent draft so it persists across reloads.
  useEffect(() => {
    if (!onDraftChange) return;
    if (transcript == null) onDraftChange(null);
    else onDraftChange({ transcript, tokens, avgConfidence, reviewed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, tokens, avgConfidence, reviewed]);

  // Tick every 500ms while a retry cooldown is active so the countdown updates.
  useEffect(() => {
    if (!cancelled) return;
    const remaining = retryAvailableAt - Date.now();
    if (remaining <= 0) return;
    const id = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(id);
  }, [cancelled, retryAvailableAt, nowTick]);

  // Cooldown scales with the number of prior attempts to avoid hammering the transcription API.
  const cooldownMsForAttempts = (attempts: number): number => {
    if (attempts <= 1) return 0;
    if (attempts === 2) return 3000;
    if (attempts === 3) return 8000;
    if (attempts === 4) return 15000;
    return 30000;
  };

  const cooldownRemainingMs = Math.max(0, retryAvailableAt - nowTick);
  const cooldownRemainingSec = Math.ceil(cooldownRemainingMs / 1000);
  const cooldownActive = cooldownRemainingMs > 0;


  const reset = () => {
    abortRef.current?.abort();
    clearPhaseTimer();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscript(null);
    setTokens([]);
    setAvgConfidence(null);
    setReviewed(false);
    setErrorMsg(null);
    setPhase("idle");
    setPhaseElapsed(0);
    setAttempt(0);
    setAttemptLog([]);
    setCancelled(false);
    setSkipped(false);
    setRetryAvailableAt(0);
    dataUrlRef.current = null;
    blobRef.current = null;
    durationRef.current = 0;
    setAttached(false);
    setElapsed(0);
    setRestoredFromDraft(false);
  };

  const enterPhase = (p: Exclude<Phase, "idle">) => {
    clearPhaseTimer();
    setPhase(p);
    setPhaseElapsed(0);
    phaseTimerRef.current = setInterval(() => setPhaseElapsed((s) => s + 1), 1000);
  };

  const logAttempt = (status: AttemptLogEntry["status"], message?: string) => {
    setAttemptLog((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now(), status, message }]);
  };

  const transcribe = async (dataUrl: string) => {
    // Snapshot the current transcript state so a subsequent cancel can be undone.
    preTranscribeSnapshotRef.current = transcript
      ? { transcript, tokens, avgConfidence, reviewed }
      : null;
    setErrorMsg(null);
    setReviewed(false);
    setTranscript(null);
    setTokens([]);
    setAvgConfidence(null);
    setCancelled(false);
    setSkipped(false);
    logAttempt("started");
    const controller = new AbortController();
    abortRef.current = controller;
    enterPhase("uploading");
    // Optimistically flip to "transcribing" once upload buffering finishes (~1.2s).
    const flipTimer = setTimeout(() => {
      if (!controller.signal.aborted) enterPhase("transcribing");
    }, 1200);
    try {
      const call = run({ data: { audioDataUrl: dataUrl } });
      const result = await new Promise<Awaited<typeof call>>((resolve, reject) => {
        controller.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
        call.then(resolve, reject);
      });
      if (controller.signal.aborted) return;
      if (!result.ok) {
        const msg = result.error || "Transcription failed.";
        setErrorMsg(msg);
        logAttempt("error", msg);
      } else {
        setTranscript(result.text);
        setTokens(result.tokens ?? []);
        setAvgConfidence(result.avgConfidence ?? null);
        logAttempt("success");
        toast.success("Voice note transcribed — review before applying");
      }
    } catch (e) {
      if ((e as { name?: string } | null)?.name === "AbortError") {
        // Silent — user-initiated cancel.
        return;
      }
      const msg = e instanceof Error ? e.message : "Transcription failed. Check your connection and try again.";
      setErrorMsg(msg);
      logAttempt("error", msg);
    } finally {
      clearTimeout(flipTimer);
      clearPhaseTimer();
      if (abortRef.current === controller) abortRef.current = null;
      setPhase("idle");
    }
  };

  const cancelTranscription = () => {
    cancelledPhaseRef.current = phase;
    cancelledElapsedRef.current = phaseElapsed;
    abortRef.current?.abort();
    abortRef.current = null;
    clearPhaseTimer();
    setPhase("idle");
    setErrorMsg(null);
    setCancelled(true);
    // Start a cooldown that scales with the number of transcription attempts so far.
    const cooldownMs = cooldownMsForAttempts(attempt);
    const readyAt = Date.now() + cooldownMs;
    setRetryAvailableAt(readyAt);
    setNowTick(Date.now());
    toast.message("Transcription cancelled", {
      action: { label: "Undo", onClick: () => undoCancel() },
    });
  };


  const undoCancel = () => {
    const snap = preTranscribeSnapshotRef.current;
    setCancelled(false);
    if (snap) {
      // Restore the prior reviewed transcript exactly as it was.
      setTranscript(snap.transcript);
      setTokens(snap.tokens);
      setAvgConfidence(snap.avgConfidence);
      setReviewed(snap.reviewed);
      logAttempt("error", "Cancellation undone — restored previous transcript");
      toast.success("Restored previous transcript");
      return;
    }
    // No prior transcript to restore — resume by re-running transcription on the saved audio.
    const url = dataUrlRef.current;
    if (!url) {
      toast.error("No saved audio to resume from");
      return;
    }
    logAttempt("error", "Cancellation undone — resuming transcription");
    toast.message("Resuming transcription…");
    setAttempt((a) => a + 1);
    void transcribe(url);
  };




  const start = async () => {
    reset();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      toast.error("Microphone access is needed to record.");
      return;
    }
    streamRef.current = stream;
    const mimeType = pickMimeType();
    let rec: MediaRecorder;
    try {
      rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      cleanupStream();
      toast.error("Recording is not supported in this browser.");
      return;
    }
    recorderRef.current = rec;
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      const type = rec.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      cleanupStream();
      setRecording(false);
      if (blob.size < 2048) { toast.error("That recording was too short — please try again."); return; }
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      blobRef.current = blob;
      mimeRef.current = type.split(";")[0];
      durationRef.current = elapsed;
      enterPhase("preparing");
      try {
        const dataUrl = await blobToDataUrl(blob);
        dataUrlRef.current = dataUrl;
        setAttempt(1);
        await transcribe(dataUrl);
      } catch (e) {
        clearPhaseTimer();
        setPhase("idle");
        setErrorMsg(e instanceof Error ? e.message : "Could not read the recorded audio.");
      }
    };
    rec.start();
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((s) => {
        const next = s + 1;
        if (next >= MAX_SECONDS) { try { rec.stop(); } catch { /* noop */ } }
        return next;
      });
    }, 1000);
  };

  const stop = () => {
    try { recorderRef.current?.stop(); } catch { /* noop */ }
  };

  const retry = () => {
    if (!dataUrlRef.current) return;
    setAttempt((n) => n + 1);
    void transcribe(dataUrlRef.current);
  };


  const attachAudio = async () => {
    if (!onAudioAttach || attached || attaching) return;
    if (!blobRef.current) return;
    setAttaching(true);
    try {
      await onAudioAttach({ blob: blobRef.current, mimeType: mimeRef.current, durationSec: durationRef.current });
      setAttached(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save audio to Media Library");
    } finally {
      setAttaching(false);
    }
  };

  const saveWithoutTranscript = async () => {
    // Abort any in-flight transcription but keep the audio.
    abortRef.current?.abort();
    abortRef.current = null;
    clearPhaseTimer();
    setPhase("idle");
    setErrorMsg(null);
    setCancelled(false);
    // Clear any partial transcript so Comments isn't nudged toward stale text.
    setTranscript(null);
    setTokens([]);
    setAvgConfidence(null);
    setReviewed(false);
    setSkipped(true);
    if (onAudioAttach && !attached && blobRef.current) {
      await attachAudio();
    }
    toast.success("Audio saved — type your notes in Comments below");
  };



  const handleApply = (mode: "append" | "replace") => {
    if (!reviewed) {
      toast.error("Review the transcript first — tick 'I've reviewed this' below.");
      return;
    }
    onTranscribed(transcript ?? "", mode);
    void attachAudio();
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  // Confidence bucket for a token: high (≥0.85), medium (0.6–0.85), low (<0.6)
  const bucketOf = (c: number): "high" | "med" | "low" => (c >= 0.85 ? "high" : c >= 0.6 ? "med" : "low");
  const bucketClass = (b: "high" | "med" | "low") =>
    b === "low"
      ? "bg-destructive/25 text-destructive-foreground underline decoration-destructive decoration-wavy underline-offset-2"
      : b === "med"
      ? "bg-amber-500/25 text-foreground"
      : "";
  const lowCount = tokens.filter((t) => bucketOf(t.confidence) === "low").length;
  const medCount = tokens.filter((t) => bucketOf(t.confidence) === "med").length;
  const overallLabel =
    avgConfidence == null ? null : avgConfidence >= 0.85 ? "High" : avgConfidence >= 0.6 ? "Medium" : "Low";
  const overallClass =
    avgConfidence == null
      ? ""
      : avgConfidence >= 0.85
      ? "text-gk-green border-gk-green/40"
      : avgConfidence >= 0.6
      ? "text-amber-500 border-amber-500/40"
      : "text-destructive border-destructive/40";


  return (
    <div className={`rounded-md border border-dashed border-border bg-accent/10 p-3 space-y-3 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />Voice Note → Comments
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Record a spoken match note — AI transcribes it into text you can drop into the comments field. Up to {MAX_SECONDS / 60} minutes.</p>
        </div>
        {(audioUrl || transcript) && !recording && (
          <button type="button" onClick={reset} className="size-7 grid place-items-center rounded-md hover:bg-accent text-muted-foreground" aria-label="Reset"><X className="size-3.5" /></button>
        )}
      </div>

      {!audioUrl && !recording && !busy && !transcript && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={start} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
            <Mic className="size-3.5" />Record voice note
          </button>
        </div>
      )}

      {recording && (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-70 animate-ping" />
              <span className="relative inline-flex rounded-full size-2 bg-destructive" />
            </span>
            Recording
          </span>
          <span className="text-xs font-mono tabular-nums text-muted-foreground">{mm}:{ss}</span>
          <button type="button" onClick={stop} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-accent">
            <Square className="size-3.5" />Stop
          </button>
        </div>
      )}

      {(audioUrl || transcript) && (
        <div className="flex flex-col gap-2">
          {audioUrl ? (
            <audio src={audioUrl} controls className="w-full h-8" />
          ) : restoredFromDraft ? (
            <div className="text-[11px] text-muted-foreground italic border border-dashed border-border rounded-md p-2">
              Transcript restored from your saved draft. The original audio isn't kept in the draft — re-record to update it.
            </div>
          ) : null}
          {busy ? (
            <div className="rounded-md border border-border bg-background p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 text-xs">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span className="font-medium text-foreground">
                    {phase === "preparing" && "Preparing audio…"}
                    {phase === "uploading" && "Uploading to AI…"}
                    {phase === "transcribing" && "Transcribing speech…"}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-muted-foreground">{phaseElapsed}s</span>
                  {attempt > 1 && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Attempt {attempt}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {onAudioAttach && (
                    <button type="button" onClick={() => void saveWithoutTranscript()} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent">
                      Save without transcript
                    </button>
                  )}
                  <button type="button" onClick={cancelTranscription} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent">
                    <X className="size-3" />Cancel
                  </button>
                </div>
              </div>
              <div className="flex gap-1" aria-hidden>
                {(["preparing", "uploading", "transcribing"] as const).map((p) => {
                  const order = { preparing: 0, uploading: 1, transcribing: 2 };
                  const active = order[phase as keyof typeof order] >= order[p];
                  return (
                    <div key={p} className={`h-1 flex-1 rounded-full ${active ? "bg-primary" : "bg-border"} ${phase === p ? "animate-pulse" : ""}`} />
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">Your recording is preserved — cancel any time to keep the audio and retry later.</p>
              {attemptLog.length > 1 && (
                <div className="pt-1 border-t border-border">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                    <History className="size-3" />Previous attempts: {attemptLog.length - 1}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {attemptLog.slice(0, -1).map((entry, i) => (
                      <span key={entry.id} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] ${entry.status === "error" ? "bg-destructive/15 text-destructive" : entry.status === "success" ? "bg-gk-green/15 text-gk-green" : "bg-primary/15 text-primary"}`}>
                        {i + 1}. {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        {entry.status === "error" && <AlertTriangle className="size-3" />}
                        {entry.status === "success" && <CheckCircle2 className="size-3" />}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : skipped ? (
            <div className="rounded-md border border-gk-green/40 bg-gk-green/5 p-2.5 space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 text-gk-green mt-0.5 shrink-0" />
                <div className="text-xs text-foreground">
                  <div className="font-medium">Audio saved without transcript</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {attached
                      ? "The recording is linked to this report. Type your notes directly into Comments below — you can transcribe later if you want."
                      : "The recording is kept in this draft. Type your notes directly into Comments below — you can transcribe later if you want."}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={retry} className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90">
                  <RotateCcw className="size-3" />Transcribe now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm("Discard this voice note and its saved audio? This cannot be undone.");
                    if (ok) reset();
                  }}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent"
                >
                  Discard
                </button>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2.5 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-3.5 text-destructive mt-0.5 shrink-0" />
                <div className="text-xs text-foreground">
                  <div className="font-medium text-destructive">Transcription failed</div>
                  <div className="text-muted-foreground mt-0.5">{errorMsg}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Your audio is still saved — retry, or copy the recording out and try later.</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={retry} className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90">
                  <RotateCcw className="size-3" />Retry transcription
                </button>
                {onAudioAttach && (
                  <button type="button" onClick={() => void saveWithoutTranscript()} disabled={attaching} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent disabled:opacity-50">
                    {attaching ? "Saving…" : "Save audio without transcript"}
                  </button>
                )}
                <button type="button" onClick={reset} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent">
                  Discard
                </button>
              </div>
              {attemptLog.length > 0 && (
                <div className="border-t border-destructive/20 pt-2">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    <History className="size-3" />Transcription attempts log
                  </div>
                  <ul className="space-y-1">
                    {attemptLog.map((entry, i) => (
                      <li key={entry.id} className="flex items-start gap-2 text-[11px]">
                        <span className="text-muted-foreground font-mono tabular-nums">{i + 1}.</span>
                        <span className="text-muted-foreground font-mono tabular-nums">{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-1 rounded-sm ${entry.status === "success" ? "bg-gk-green/20 text-gk-green" : entry.status === "error" ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"}`}>
                          {entry.status === "success" && <CheckCircle2 className="size-3" />}
                          {entry.status === "error" && <AlertTriangle className="size-3" />}
                          {entry.status === "started" && <Loader2 className="size-3 animate-spin" />}
                          {entry.status === "success" ? "Success" : entry.status === "error" ? "Failed" : "Started"}
                        </span>
                        {entry.message && <span className="text-muted-foreground truncate max-w-[180px]" title={entry.message}>{entry.message}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : cancelled ? (
            <div className="rounded-md border border-border bg-background p-2.5 space-y-2">
              <div className="flex items-start gap-2">
                <XCircle className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-xs text-foreground">
                  <div className="font-medium">Transcription cancelled</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {cancelledPhaseRef.current !== "idle" && (
                      <>Stopped during <span className="font-mono uppercase tracking-wider">{cancelledPhaseRef.current}</span>{cancelledElapsedRef.current ? ` at ${cancelledElapsedRef.current}s` : ""}. </>
                    )}
                    The audio recording is still saved. Undo to continue where you left off, retry, or save without a transcript.
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={undoCancel} className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90">
                  <RotateCcw className="size-3" />Undo cancellation
                </button>
                <button type="button" onClick={retry} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent">
                  Retry from scratch
                </button>
                {onAudioAttach && (
                  <button type="button" onClick={() => void saveWithoutTranscript()} disabled={attaching} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent disabled:opacity-50">
                    {attaching ? "Saving…" : "Save audio without transcript"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm("Discard this voice note and its saved audio? This cannot be undone.");
                    if (ok) reset();
                  }}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent"
                >
                  Discard
                </button>
              </div>
            </div>
          ) : transcript ? (

            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Transcript — review before applying</div>
                <div className="flex items-center gap-1.5">
                  {overallLabel && !editing && (
                    <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-md border text-[10px] font-mono uppercase tracking-wider ${overallClass}`}>
                      {overallLabel} confidence · {Math.round((avgConfidence ?? 0) * 100)}%
                    </span>
                  )}
                  {!editing && (
                    <button
                      type="button"
                      onClick={() => { setEditValue(transcript); setEditing(true); }}
                      className="inline-flex items-center gap-1 h-5 px-1.5 rounded-md border border-border text-[10px] font-medium hover:bg-accent"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              {editing ? (
                <>
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={6}
                    className="w-full text-xs bg-background border border-border rounded-md p-2 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Edit the transcript…"
                  />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">Saving edits clears confidence highlights and resets the review checkbox.</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = editValue.trim();
                          if (!next) { toast.error("Transcript can't be empty"); return; }
                          setTranscript(next);
                          setTokens([]);
                          setAvgConfidence(null);
                          setReviewed(false);
                          setEditing(false);
                        }}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90"
                      >
                        Save edits
                      </button>
                    </div>
                  </div>
                </>
              ) : tokens.length > 0 ? (
                <div className="text-xs whitespace-pre-wrap bg-background border border-border rounded-md p-2 max-h-40 overflow-y-auto leading-relaxed">
                  {tokens.map((t, i) => {
                    const b = bucketOf(t.confidence);
                    const cls = bucketClass(b);
                    return (
                      <span
                        key={i}
                        className={cls ? `rounded-sm px-[1px] ${cls}` : undefined}
                        title={`Confidence ${(t.confidence * 100).toFixed(0)}%`}
                      >
                        {t.token}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs whitespace-pre-wrap bg-background border border-border rounded-md p-2 max-h-40 overflow-y-auto">{transcript}</div>
              )}
              {!editing && tokens.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-amber-500/50" />Medium ({medCount})</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-destructive/50" />Low ({lowCount})</span>
                  <span className="opacity-70">Hover a highlighted word to see its score.</span>
                </div>
              )}
              {!editing && (
                <>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-foreground select-none">
                    <input
                      type="checkbox"
                      checked={reviewed}
                      onChange={(e) => setReviewed(e.target.checked)}
                      className="size-3.5 accent-primary"
                    />
                    I've reviewed the highlighted segments
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" disabled={!reviewed} onClick={() => handleApply("append")} className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                      Append to comments
                    </button>
                    <button type="button" disabled={!reviewed} onClick={() => handleApply("replace")} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed">
                      Replace comments
                    </button>
                    <button type="button" onClick={() => { navigator.clipboard?.writeText(transcript); toast.success("Copied"); }} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent">
                      Copy
                    </button>
                    <button type="button" onClick={retry} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent">
                      <RotateCcw className="size-3" />Retry
                    </button>
                  </div>
                </>
              )}


              {onAudioAttach && blobRef.current && (
                <div className="text-[11px] mt-1">
                  {attaching ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="size-3 animate-spin" />Saving audio to Media Library…</span>
                  ) : attached ? (
                    <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="size-3" />Audio saved to Media Library and linked to this report</span>
                  ) : (
                    <button type="button" onClick={attachAudio} className="underline text-muted-foreground hover:text-foreground">
                      Save audio to Media Library
                    </button>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
