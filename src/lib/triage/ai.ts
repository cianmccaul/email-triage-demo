import { z } from "zod";
import { FOLDERS, normaliseFolder } from "../folders";
import { chatJson } from "../groq";
import type { LearnedRule, Sender, Triage } from "../types";

/** What we accept back from the model. Anything else is rejected, never guessed at. */
const AiTriage = z.object({
  folder: z.string(),
  draft: z.string().max(4000).default(""),
  reasoning: z.string().max(600).default(""),
});

export function buildTriagePrompt(handbook: string, rules: LearnedRule[]): string {
  const folderList = FOLDERS.map((f) => `- "${f.id}": ${f.description}`).join("\n");
  const learned = rules.length
    ? `\nRULES LEARNED FROM STAFF EDITS (follow these):\n${rules.map((r) => `- ${r.text}`).join("\n")}\n`
    : "";

  return `You are the receptionist at a small physiotherapy clinic. Sort each incoming email into one folder and draft a reply.

CLINIC HANDBOOK (the only facts you may use; never invent prices, times or policies):
${handbook}
${learned}
FOLDERS:
${folderList}

RULES:
- Safety first: new numbness or weakness, chest pain, bladder or bowel changes, or a suspected fracture go in "priority", and the reply tells them to contact their GP or emergency department today.
- Spam gets an empty draft.
- Never give a diagnosis.
- Write the draft as plain text, following the reply style in the handbook.

Reply with JSON only: {"folder": "<one of: ${FOLDERS.map((f) => f.id).join(", ")}>", "draft": "<reply>", "reasoning": "<one or two sentences on why>"}`;
}

/**
 * Parse and validate the model's answer. Returns null if it can't be trusted,
 * so the caller falls back to the rule-based sorter.
 */
export function parseAiTriage(raw: string): Omit<Triage, "redFlag"> | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    // Some models wrap JSON in prose or code fences. Take the outermost object.
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      json = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  const parsed = AiTriage.safeParse(json);
  if (!parsed.success) return null;

  const folder = normaliseFolder(parsed.data.folder);
  if (!folder) return null;

  return {
    folder,
    draft: folder === "spam" ? "" : parsed.data.draft.trim(),
    reasoning: parsed.data.reasoning.trim() || "Sorted by the AI model.",
    source: "ai",
  };
}

export async function sortWithAi(
  email: { from: Sender; subject: string; body: string },
  handbook: string,
  rules: LearnedRule[],
): Promise<Omit<Triage, "redFlag"> | null> {
  const user = `From: ${email.from.name} <${email.from.email}>\nSubject: ${email.subject}\n\n${email.body}`;
  const raw = await chatJson(buildTriagePrompt(handbook, rules), user);
  return parseAiTriage(raw);
}
