import { aiEnabled } from "../groq";
import type { LearnedRule, Sender, Triage } from "../types";
import { sortWithAi } from "./ai";
import { hasRedFlag, sortWithRules } from "./rules";

/**
 * Sort one email. Uses the AI model when a key is configured, and falls back
 * to the built-in rules if it isn't, or if the model errors or returns
 * something invalid. The red-flag check runs either way: a safety keyword
 * always lands in Priority, whatever the model said.
 */
export async function triageEmail(
  email: { from: Sender; subject: string; body: string },
  handbook: string,
  rules: LearnedRule[] = [],
): Promise<Triage> {
  const rulesResult = sortWithRules(email);
  if (!aiEnabled()) return rulesResult;

  try {
    const ai = await sortWithAi(email, handbook, rules);
    if (!ai) return rulesResult;

    const redFlag = hasRedFlag(`${email.subject}\n${email.body}`);
    if (redFlag && ai.folder !== "priority") {
      // The model missed a safety symptom. Trust the safety check instead.
      return rulesResult;
    }
    return { ...ai, redFlag };
  } catch (err) {
    console.error("AI triage failed, using rules:", err instanceof Error ? err.message : err);
    return rulesResult;
  }
}
