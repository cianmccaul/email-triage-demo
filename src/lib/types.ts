import type { FolderId } from "./folders";

export interface Sender {
  name: string;
  email: string;
}

/** What the triage step decided about one email. */
export interface Triage {
  folder: FolderId;
  /** Suggested reply, ready for staff to edit. Empty for spam. */
  draft: string;
  /** One or two sentences on why it landed in this folder. */
  reasoning: string;
  /** "ai" when the language model sorted it, "rules" when the built-in sorter did. */
  source: "ai" | "rules";
  /** True when a safety keyword (numbness, chest pain, ...) forced it into Priority. */
  redFlag: boolean;
  /** Set when AI was wanted but the built-in rules stepped in: see lib/ai-limits.ts. */
  fallback?: AiFallback;
}

/** Why the built-in rules stood in for the AI: today's limit for this visitor, or Groq's quota. */
export type AiFallback = "limit" | "quota";

export type EmailStatus = "sorting" | "open" | "sent";

export interface Email {
  id: string;
  from: Sender;
  subject: string;
  body: string;
  receivedAt: string; // ISO date
  status: EmailStatus;
  triage?: Triage;
  /** The reply as staff last edited it. */
  reply?: string;
  sentAt?: string;
  /** Set on emails sent from the test panel: where it should land. */
  test?: { id: string; label: string; expected: FolderId };
}

/** A rule the app learned by comparing an AI draft with what staff actually sent. */
export interface LearnedRule {
  id: string;
  text: string;
  learnedAt: string;
  source: "ai" | "rules";
}
