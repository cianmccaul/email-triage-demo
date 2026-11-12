import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiAccess, aiSwitchedOn, dailyLimit, noteQuotaHit, quotaPaused, resetAiLimits, takeAiCall } from "@/lib/ai-limits";
import { learnFromEdit } from "@/lib/learn";
import { triageEmail } from "@/lib/triage";
import { POST as triageRoute } from "@/app/api/triage/route";
import { POST as learnRoute } from "@/app/api/learn/route";

const NOON = Date.parse("2026-11-12T12:00:00Z");
const email = { from: { name: "Siobhan Murphy", email: "siobhan.m@example.com" }, subject: "Price", body: "How much is an initial assessment?" };

/** A stand-in for Groq: answers with a valid triage, or with an error status. */
function stubGroq(status = 200, headers: Record<string, string> = {}) {
  const fetchMock = vi.fn(async () =>
    status === 200
      ? new Response(JSON.stringify({ choices: [{ message: { content: '{"folder":"admin","draft":"Hi Siobhan,","reasoning":"A price question."}' } }] }), { status })
      : new Response("rate limited", { status, headers }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function triageRequest(cookie?: string, ip = "203.0.113.7") {
  return new Request("http://demo.local/api/triage", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ email, handbook: "Initial assessment: €70." }),
  });
}

beforeEach(() => resetAiLimits());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("switching AI on and off", () => {
  it("needs a key, and AI_ENABLED=false turns it off", () => {
    expect(aiSwitchedOn({})).toBe(false);
    expect(aiSwitchedOn({ GROQ_API_KEY: "k" })).toBe(true);
    expect(aiSwitchedOn({ GROQ_API_KEY: "k", AI_ENABLED: "true" })).toBe(true);
    for (const off of ["false", "FALSE", "0", "off", "no", " false "]) expect(aiSwitchedOn({ GROQ_API_KEY: "k", AI_ENABLED: off })).toBe(false);
  });

  it("reads the daily limit, defaulting to 20", () => {
    expect(dailyLimit({})).toBe(20);
    expect(dailyLimit({ AI_DAILY_LIMIT: "40" })).toBe(40);
    expect(dailyLimit({ AI_DAILY_LIMIT: "0" })).toBe(0);
    expect(dailyLimit({ AI_DAILY_LIMIT: "lots" })).toBe(20);
    expect(dailyLimit({ AI_DAILY_LIMIT: "-5" })).toBe(20);
  });
});

describe("the per-visitor daily limit", () => {
  it("allows 20 calls a day, then stops", () => {
    const v = { id: "visitor-a", ip: "203.0.113.7" };
    for (let i = 0; i < 20; i++) expect(takeAiCall(v, NOON, 20)).toBe(true);
    expect(takeAiCall(v, NOON, 20)).toBe(false);
    // someone else on the same network still has their own
    expect(takeAiCall({ id: "visitor-b", ip: "203.0.113.7" }, NOON, 20)).toBe(true);
  });

  it("resets at midnight, Irish time", () => {
    const v = { id: "visitor-a", ip: null };
    for (let i = 0; i < 20; i++) takeAiCall(v, NOON, 20);
    expect(takeAiCall(v, Date.parse("2026-11-12T23:59:00Z"), 20)).toBe(false);
    expect(takeAiCall(v, Date.parse("2026-11-13T00:01:00Z"), 20)).toBe(true);
  });

  it("caps each IP at three visitors' worth, so clearing cookies doesn't reset it", () => {
    let allowed = 0;
    for (let i = 0; i < 100; i++) if (takeAiCall({ id: `fresh-cookie-${i}`, ip: "198.51.100.1" }, NOON, 20)) allowed++;
    expect(allowed).toBe(60);
  });
});

describe("Groq's quota", () => {
  it("pauses AI for everyone until Groq's retry-after time", () => {
    expect(quotaPaused(NOON)).toBe(false);
    noteQuotaHit(30, NOON);
    expect(quotaPaused(NOON + 29_000)).toBe(true);
    expect(quotaPaused(NOON + 31_000)).toBe(false);
  });

  it("doesn't count a call against the visitor while paused", () => {
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("AI_DAILY_LIMIT", "1");
    const v = { id: "visitor-a", ip: null };
    noteQuotaHit(30, NOON);
    expect(aiAccess(v, NOON)).toEqual({ allowed: false, fallback: "quota" });
    expect(aiAccess(v, NOON + 60_000)).toEqual({ allowed: true });
    expect(aiAccess(v, NOON + 60_000)).toEqual({ allowed: false, fallback: "limit" });
  });
});

describe("sorting with the limits", () => {
  it("uses the rules and says why when the visitor is over the limit", async () => {
    const fetchMock = stubGroq();
    vi.stubEnv("GROQ_API_KEY", "k");
    const t = await triageEmail(email, "", [], () => ({ allowed: false, fallback: "limit" }));
    expect(t).toMatchObject({ source: "rules", fallback: "limit" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to the rules when Groq's quota is used up, and pauses AI", async () => {
    stubGroq(429, { "retry-after": "45" });
    vi.stubEnv("GROQ_API_KEY", "k");
    const t = await triageEmail(email, "", [], () => ({ allowed: true }));
    expect(t).toMatchObject({ source: "rules", fallback: "quota" });
    expect(quotaPaused()).toBe(true);
  });

  it("other AI errors still fall back quietly", async () => {
    stubGroq(500);
    vi.stubEnv("GROQ_API_KEY", "k");
    const t = await triageEmail(email, "", [], () => ({ allowed: true }));
    expect(t.source).toBe("rules");
    expect(t.fallback).toBeUndefined();
    expect(quotaPaused()).toBe(false);
  });

  it("AI_ENABLED=false uses the rules with no AI call", async () => {
    const fetchMock = stubGroq();
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("AI_ENABLED", "false");
    const res = await triageRoute(triageRequest());
    expect(await res.json()).toMatchObject({ source: "rules" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("the API routes", () => {
  it("give each visitor a cookie and count their calls", async () => {
    stubGroq();
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("AI_DAILY_LIMIT", "2");

    const first = await triageRoute(triageRequest());
    const cookie = first.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^nb_visitor=[A-Za-z0-9-]+;/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(await first.json()).toMatchObject({ source: "ai" });

    const sent = cookie.split(";")[0];
    const second = await triageRoute(triageRequest(sent));
    expect(second.headers.get("set-cookie")).toBeNull();
    expect(await second.json()).toMatchObject({ source: "ai" });

    const third = await triageRoute(triageRequest(sent));
    expect(await third.json()).toMatchObject({ source: "rules", fallback: "limit" });
  });

  it("learning shares the same limit, and an unchanged draft doesn't use a call", async () => {
    const fetchMock = stubGroq();
    vi.stubEnv("GROQ_API_KEY", "k");
    vi.stubEnv("AI_DAILY_LIMIT", "1");
    const learn = (original: string, edited: string) =>
      learnRoute(
        new Request("http://demo.local/api/learn", {
          method: "POST",
          headers: { "content-type": "application/json", cookie: "nb_visitor=visitor-learn-1", "x-forwarded-for": "192.0.2.9" },
          body: JSON.stringify({ original, edited }),
        }),
      );

    await learn("Hi Siobhan,", "Hi Siobhan,");
    expect(fetchMock).not.toHaveBeenCalled();

    await learn("Hi Siobhan,", "Hi Siobhan, students get 10% off with a valid card.");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const res = await learn("Hi Siobhan,", "Hi Siobhan, we're open late on Thursdays.");
    expect(await res.json()).toMatchObject({ source: "rules", fallback: "limit" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("works with no key at all, as before", async () => {
    const fetchMock = stubGroq();
    const res = await triageRoute(triageRequest());
    const body = await res.json();
    expect(body.source).toBe("rules");
    expect(body.fallback).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await learnFromEdit("a", "a")).toEqual({ rule: null, source: "rules" });
  });
});
