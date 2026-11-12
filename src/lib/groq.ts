/**
 * Minimal Groq client using its OpenAI-compatible REST API.
 * No SDK needed; this runs on the server only, so the key never reaches the browser.
 */
import { aiSwitchedOn } from "./ai-limits";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** A key is set and AI_ENABLED isn't false. Per-visitor limits are checked in lib/ai-limits.ts. */
export function aiEnabled(): boolean {
  return aiSwitchedOn();
}

/** Groq answered with an error. status 429 means the quota is used up for now. */
export class GroqError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfterSeconds: number | null,
  ) {
    super(`Groq returned ${status}`);
  }
}

function retryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds;
  const at = Date.parse(header);
  return Number.isNaN(at) ? null : Math.max(0, (at - Date.now()) / 1000);
}

export async function chatJson(system: string, user: string, opts: { temperature?: number; timeoutMs?: number } = {}): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: opts.temperature ?? 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
  });

  if (!res.ok) throw new GroqError(res.status, retryAfter(res.headers.get("retry-after")));
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty response");
  return content;
}
