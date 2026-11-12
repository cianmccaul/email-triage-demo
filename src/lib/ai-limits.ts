/**
 * Keeps the public demo's AI use in check, so one visitor (or a bot) can't use
 * up the Groq free tier for everyone.
 *
 * - AI_ENABLED=false (or 0 / off / no) switches the AI off without removing the
 *   key: everything is sorted by the built-in rules.
 * - Each visitor gets AI_DAILY_LIMIT AI calls a day (default 20), counted by a
 *   visitor cookie. Each IP address also has a backstop of three times that, so
 *   clearing cookies doesn't reset the count. Days are Irish days.
 * - When Groq says the quota is used up (HTTP 429), AI pauses for everyone until
 *   Groq's retry-after time, instead of failing call after call.
 *
 * Over the limit, the built-in rules take over and the app says so. Counts are
 * kept in the server's memory: simple and free, but best effort. A restart
 * clears them, and separate server instances count separately. Groq's own
 * quota is the hard backstop.
 */
import type { AiFallback } from "./types";

export type AiAccess = { allowed: true } | { allowed: false; fallback?: AiFallback };

type Env = Record<string, string | undefined>;

export const DEFAULT_DAILY_LIMIT = 20;
/** Each IP address may use this many visitors' worth of calls a day. */
export const IP_MULTIPLIER = 3;

/** A key is set and the kill switch isn't off. */
export function aiSwitchedOn(env: Env = process.env): boolean {
  if (!env.GROQ_API_KEY) return false;
  return !/^(false|0|off|no)$/i.test((env.AI_ENABLED ?? "").trim());
}

/** AI calls per visitor per day. Unset or invalid means the default. */
export function dailyLimit(env: Env = process.env): number {
  const raw = (env.AI_DAILY_LIMIT ?? "").trim();
  if (!/^\d+$/.test(raw)) return DEFAULT_DAILY_LIMIT;
  return Number(raw);
}

const IRISH_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" });
const irishDay = (now: number) => IRISH_DAY.format(new Date(now));

const counts = new Map<string, number>();
let countsDay = "";
let pausedUntil = 0;

/**
 * Counts one AI call for this visitor, if they have one left today.
 * Returns false (and counts nothing) when the visitor or their IP is at the limit.
 */
export function takeAiCall(visitor: { id: string; ip: string | null }, now = Date.now(), limit = dailyLimit()): boolean {
  const day = irishDay(now);
  if (day !== countsDay || counts.size > 100_000) {
    counts.clear();
    countsDay = day;
  }
  const keys: [string, number][] = [[`v:${visitor.id}`, limit]];
  if (visitor.ip) keys.push([`ip:${visitor.ip}`, limit * IP_MULTIPLIER]);
  if (keys.some(([key, max]) => (counts.get(key) ?? 0) >= max)) return false;
  for (const [key] of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return true;
}

/** Groq said the quota is used up: pause AI for everyone until it says to retry. */
export function noteQuotaHit(retryAfterSeconds: number | null, now = Date.now()): void {
  const seconds = Math.min(Math.max(retryAfterSeconds ?? 60, 1), 24 * 60 * 60);
  pausedUntil = Math.max(pausedUntil, now + seconds * 1000);
}

export function quotaPaused(now = Date.now()): boolean {
  return now < pausedUntil;
}

/** May this visitor make an AI call right now? Counts the call if so. */
export function aiAccess(visitor: { id: string; ip: string | null }, now = Date.now()): AiAccess {
  if (!aiSwitchedOn()) return { allowed: false };
  if (quotaPaused(now)) return { allowed: false, fallback: "quota" };
  if (!takeAiCall(visitor, now)) return { allowed: false, fallback: "limit" };
  return { allowed: true };
}

/** Tests only. */
export function resetAiLimits(): void {
  counts.clear();
  countsDay = "";
  pausedUntil = 0;
}
