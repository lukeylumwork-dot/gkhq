import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  // data URL: "data:image/jpeg;base64,...."
  imageDataUrl: z
    .string()
    .min(32)
    .max(15_000_000)
    .regex(/^data:image\/(png|jpeg|jpg|webp|heic|heif);base64,/i, "Must be a base64 image data URL"),
  context: z.string().max(500).optional(),
});

const SYSTEM_PROMPT = `You are an OCR and handwriting transcription assistant for RPM, a goalkeeper performance management organisation.
You receive a photo of handwritten notes taken by a goalkeeper mentor during a session, match or meeting.

Your job:
- Transcribe the handwriting verbatim into clean, well-punctuated English.
- Preserve bullets, dashes and numbered lists as Markdown bullets ("- " or "1. ").
- Preserve headings the mentor underlined or wrote in capitals.
- Preserve player names, club names, drill names, scores and dates exactly as written.
- If a word is illegible, write [illegible] in place of guessing.
- Do not add commentary, summary, or analysis — only the transcription.
- If the image clearly contains no handwriting, reply with exactly: NO_HANDWRITING_DETECTED`;

export const transcribeNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI service is not configured." };
    }

    const userText = data.context?.trim()
      ? `Context from the mentor: ${data.context.trim()}\n\nTranscribe the handwritten notes in this image.`
      : "Transcribe the handwritten notes in this image.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return { ok: false as const, error: "Rate limit reached — please try again in a moment." };
      if (res.status === 402) return { ok: false as const, error: "AI credits exhausted — add credits in your workspace settings." };
      const detail = await res.text().catch(() => "");
      console.error("transcribeNotes gateway error", res.status, detail);
      return { ok: false as const, error: `Transcription failed (${res.status}).` };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, error: "No transcription returned." };
    if (text === "NO_HANDWRITING_DETECTED") {
      return { ok: false as const, error: "No handwritten notes detected in that image." };
    }
    return { ok: true as const, text };
  });

const AUDIO_EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
};

const VoiceInputSchema = z.object({
  audioDataUrl: z
    .string()
    .min(64)
    .max(25_000_000)
    .regex(/^data:audio\/[a-z0-9.+-]+;base64,/i, "Must be a base64 audio data URL"),
});

export const transcribeVoiceNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => VoiceInputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI service is not configured." };

    const match = /^data:(audio\/[a-z0-9.+-]+);base64,(.+)$/i.exec(data.audioDataUrl);
    if (!match) return { ok: false as const, error: "Invalid audio payload." };
    const mime = match[1].toLowerCase().split(";")[0];
    const b64 = match[2];
    const ext = AUDIO_EXT[mime] ?? "webm";

    let bytes: Uint8Array;
    try {
      const bin = atob(b64);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch {
      return { ok: false as const, error: "Could not decode audio." };
    }
    if (bytes.byteLength < 2048) {
      return { ok: false as const, error: "Recording is too short — please try again." };
    }

    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", new Blob([bytes.buffer.slice(0) as ArrayBuffer], { type: mime }), `voice-note.${ext}`);
    form.append("response_format", "json");
    form.append("include[]", "logprobs");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      if (res.status === 429) return { ok: false as const, error: "Rate limit reached — try again in a moment." };
      if (res.status === 402) return { ok: false as const, error: "AI credits exhausted — add credits in workspace settings." };
      const detail = await res.text().catch(() => "");
      console.error("transcribeVoiceNote gateway error", res.status, detail);
      return { ok: false as const, error: `Transcription failed (${res.status}).` };
    }

    const json = (await res.json()) as {
      text?: string;
      logprobs?: Array<{ token: string; logprob: number }>;
    };
    const text = json.text?.trim() ?? "";
    if (!text) return { ok: false as const, error: "No transcription returned." };

    const tokens = Array.isArray(json.logprobs)
      ? json.logprobs
          .filter((t) => typeof t?.token === "string" && typeof t?.logprob === "number")
          .map((t) => ({ token: t.token, confidence: Math.max(0, Math.min(1, Math.exp(t.logprob))) }))
      : [];
    const avgConfidence = tokens.length
      ? tokens.reduce((s, t) => s + t.confidence, 0) / tokens.length
      : null;

    return { ok: true as const, text, tokens, avgConfidence };
  });
