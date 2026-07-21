import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, Square, Loader2, X, RotateCcw, Sparkles, CheckCircle2 } from "lucide-react";
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

interface Props {
  onTranscribed: (text: string, mode: "replace" | "append") => void;
  onAudioAttach?: (audio: { blob: Blob; mimeType: string; durationSec: number }) => void | Promise<void>;
  className?: string;
}

export function VoiceNoteField({ onTranscribed, onAudioAttach, className }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Array<{ token: string; confidence: number }>>([]);
  const [avgConfidence, setAvgConfidence] = useState<number | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const dataUrlRef = useRef<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const mimeRef = useRef<string>("audio/webm");
  const durationRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [attached, setAttached] = useState(false);
  const [attaching, setAttaching] = useState(false);

  const run = useServerFn(transcribeVoiceNote);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => () => {
    cleanupStream();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscript(null);
    setTokens([]);
    setAvgConfidence(null);
    setReviewed(false);
    dataUrlRef.current = null;
    blobRef.current = null;
    durationRef.current = 0;
    setAttached(false);
    setElapsed(0);
  };

  const transcribe = async (dataUrl: string) => {
    setBusy(true);
    setReviewed(false);
    try {
      const result = await run({ data: { audioDataUrl: dataUrl } });
      if (!result.ok) {
        toast.error(result.error);
        setTranscript(null);
        setTokens([]);
        setAvgConfidence(null);
      } else {
        setTranscript(result.text);
        setTokens(result.tokens ?? []);
        setAvgConfidence(result.avgConfidence ?? null);
        toast.success("Voice note transcribed — review before applying");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transcription failed");
    } finally {
      setBusy(false);
    }
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
      try {
        const dataUrl = await blobToDataUrl(blob);
        dataUrlRef.current = dataUrl;
        await transcribe(dataUrl);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not read audio");
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
    setTranscript(null);
    transcribe(dataUrlRef.current);
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

  const handleApply = (mode: "append" | "replace") => {
    onTranscribed(transcript ?? "", mode);
    void attachAudio();
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

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

      {!audioUrl && !recording && !busy && (
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

      {audioUrl && (
        <div className="flex flex-col gap-2">
          <audio src={audioUrl} controls className="w-full h-8" />
          {busy ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Transcribing…</div>
          ) : transcript ? (
            <>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Transcript</div>
              <div className="text-xs whitespace-pre-wrap bg-background border border-border rounded-md p-2 max-h-40 overflow-y-auto">{transcript}</div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => handleApply("append")} className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90">
                  Append to comments
                </button>
                <button type="button" onClick={() => handleApply("replace")} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent">
                  Replace comments
                </button>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(transcript); toast.success("Copied"); }} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent">
                  Copy
                </button>
                <button type="button" onClick={retry} className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-[11px] font-medium hover:bg-accent">
                  <RotateCcw className="size-3" />Retry
                </button>
              </div>
              {onAudioAttach && (
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
