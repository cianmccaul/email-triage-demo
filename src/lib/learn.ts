import { z } from "zod";
import { type AiAccess, noteQuotaHit } from "./ai-limits";
import { aiEnabled, chatJson, GroqError } from "./groq";
import type { AiFallback } from "./types";

/**
 * When staff edit a draft before sending, work out what they changed and
 * turn it into a short rule the assistant follows next time.
 */

const LearnResponse = z.object({ rule: z.string().max(300) });

/** Split into sentences so we can compare drafts sentence by sentence. */
function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9€ ]/g, "").trim();

/** Sentences staff added that weren't in the original draft. */
export function addedSentences(original: string, edited: string): string[] {
  const before = new Set(sentences(original).map(normalise));
  return sentences(edited).filter((s) => !before.has(normalise(s)) && normalise(s).length > 3);
}

/** Without AI: keep the first meaningful sentence staff added as the rule. */
export function learnWithoutAi(original: string, edited: string): string | null {
  const added = addedSentences(original, edited).filter((s) => !/^(hi|hello|dear|kind regards|thanks)\b/i.test(s));
  if (added.length === 0) return null;
  const sentence = added[0].length > 160 ? `${added[0].slice(0, 157)}...` : added[0];
  return `When relevant, include: "${sentence}"`;
}

export async function learnFromEdit(
  original: string,
  edited: string,
  ai: () => AiAccess = () => ({ allowed: aiEnabled() }),
): Promise<{ rule: string | null; source: "ai" | "rules"; fallback?: AiFallback }> {
  if (original.trim() === edited.trim()) return { rule: null, source: "rules" };

  // Only asked here, so an unchanged draft never uses up an AI call.
  const access = ai();
  let fallback: AiFallback | undefined = access.allowed ? undefined : access.fallback;
  if (access.allowed) {
    try {
      const raw = await chatJson(
        `You help train a clinic's email assistant. Compare the assistant's draft with the version staff actually sent.
Work out the one fact, policy or tone preference staff added or corrected, and write it as a single short rule the assistant should follow in future (max 25 words).
If the change is only typos or rewording with no new information, return an empty rule.
Reply with JSON only: {"rule": "<rule or empty string>"}`,
        `ASSISTANT DRAFT:\n${original}\n\nWHAT STAFF SENT:\n${edited}`,
        { temperature: 0.2 },
      );
      const parsed = LearnResponse.safeParse(JSON.parse(raw));
      if (parsed.success) return { rule: parsed.data.rule.trim() || null, source: "ai" };
    } catch (err) {
      if (err instanceof GroqError && err.status === 429) {
        noteQuotaHit(err.retryAfterSeconds);
        fallback = "quota";
      } else {
        console.error("AI learning failed, using rules:", err instanceof Error ? err.message : err);
      }
    }
  }
  const rule = learnWithoutAi(original, edited);
  return fallback ? { rule, source: "rules", fallback } : { rule, source: "rules" };
}
