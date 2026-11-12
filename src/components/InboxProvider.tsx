"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { FolderId } from "@/lib/folders";
import { DEFAULT_HANDBOOK } from "@/lib/handbook";
import { sampleInbox } from "@/lib/sample-inbox";
import type { TestEmail } from "@/lib/test-emails";
import type { AiFallback, Email, LearnedRule, Sender, Triage } from "@/lib/types";

/** What to tell the visitor when the built-in rules stand in for the AI (see lib/ai-limits.ts). */
export const AI_FALLBACK_TEXT: Record<AiFallback, { badge: string; toast: string }> = {
  limit: {
    badge: "Today's AI limit reached · sorting with built-in rules",
    toast: "You've used today's AI sorting for this demo, so the built-in rules are taking over. It resets at midnight, Irish time.",
  },
  quota: {
    badge: "AI busy · sorting with built-in rules",
    toast: "The AI has hit its free-tier limit for now, so the built-in rules are taking over. Try again in a little while.",
  },
};

export type View =
  | { kind: "folder"; folder: FolderId }
  | { kind: "sent" }
  | { kind: "handbook" }
  | { kind: "tests" };

interface State {
  emails: Email[];
  handbook: string;
  rules: LearnedRule[];
  view: View;
  selectedId: string | null;
}

type Action =
  | { type: "hydrate"; state: Pick<State, "emails" | "handbook" | "rules"> }
  | { type: "add"; emails: Email[] }
  | { type: "triaged"; id: string; triage: Triage }
  | { type: "retriage"; id: string }
  | { type: "view"; view: View }
  | { type: "select"; id: string | null }
  | { type: "reply"; id: string; text: string }
  | { type: "sent"; id: string }
  | { type: "move"; id: string; folder: FolderId }
  | { type: "handbook"; text: string }
  | { type: "addRule"; rule: LearnedRule }
  | { type: "removeRule"; id: string }
  | { type: "reset" };

const STORAGE_KEY = "triage-demo:v1";

function freshState(): State {
  return {
    emails: sampleInbox(),
    handbook: DEFAULT_HANDBOOK,
    rules: [],
    view: { kind: "folder", folder: "priority" },
    selectedId: null,
  };
}

const update = (emails: Email[], id: string, fn: (e: Email) => Email) => emails.map((e) => (e.id === id ? fn(e) : e));

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.state };
    case "add":
      return { ...state, emails: [...action.emails, ...state.emails] };
    case "triaged":
      return {
        ...state,
        emails: update(state.emails, action.id, (e) => ({ ...e, status: "open", triage: action.triage, reply: action.triage.draft })),
      };
    case "retriage":
      return { ...state, emails: update(state.emails, action.id, (e) => ({ ...e, status: "sorting" })) };
    case "view":
      return { ...state, view: action.view, selectedId: null };
    case "select":
      return { ...state, selectedId: action.id };
    case "reply":
      return { ...state, emails: update(state.emails, action.id, (e) => ({ ...e, reply: action.text })) };
    case "sent":
      return {
        ...state,
        selectedId: null,
        emails: update(state.emails, action.id, (e) => ({ ...e, status: "sent", sentAt: new Date().toISOString() })),
      };
    case "move":
      return {
        ...state,
        emails: update(state.emails, action.id, (e) =>
          e.triage
            ? { ...e, triage: { ...e.triage, folder: action.folder, reasoning: "Moved here by staff.", source: e.triage.source } }
            : e,
        ),
      };
    case "handbook":
      return { ...state, handbook: action.text };
    case "addRule":
      return { ...state, rules: [action.rule, ...state.rules].slice(0, 30) };
    case "removeRule":
      return { ...state, rules: state.rules.filter((r) => r.id !== action.id) };
    case "reset":
      return freshState();
  }
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

interface InboxApi extends State {
  hydrated: boolean;
  /** "ai" or "rules": which sorter handled the most recent email. */
  mode: Triage["source"] | null;
  /** Why the rules are standing in for the AI right now, if they are. */
  aiNotice: AiFallback | null;
  toast: string | null;
  sortingCount: number;
  setView: (view: View) => void;
  select: (id: string | null) => void;
  setReply: (id: string, text: string) => void;
  send: (id: string) => Promise<void>;
  move: (id: string, folder: FolderId) => void;
  retriage: (id: string) => void;
  setHandbook: (text: string) => void;
  removeRule: (id: string) => void;
  sendTestEmails: (tests: TestEmail[]) => void;
  sendCustomEmail: (email: { from: Sender; subject: string; body: string }) => void;
  reset: () => void;
}

const InboxContext = createContext<InboxApi | null>(null);

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, freshState);
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<InboxApi["mode"]>(null);
  const [aiNotice, setAiNotice] = useState<AiFallback | null>(null);
  const aiNoticeRef = useRef<AiFallback | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const inFlight = useRef<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Restore the demo from this browser, if it's been used before.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Pick<State, "emails" | "handbook" | "rules">;
        // Anything mid-sort when the page closed gets sorted again.
        parsed.emails = parsed.emails.map((e) => (e.status === "sorting" || !e.triage ? { ...e, status: "sorting" } : e));
        dispatch({ type: "hydrate", state: parsed });
      }
    } catch {
      /* storage unavailable or corrupt: start fresh */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const { emails, handbook, rules } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ emails, handbook, rules }));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 4500);
  }, []);

  // Tell the visitor once when the rules start standing in for the AI, and clear it when the AI is back.
  const noteAi = useCallback(
    (source: Triage["source"], fallback: AiFallback | undefined) => {
      const next = source === "ai" ? null : (fallback ?? aiNoticeRef.current);
      if (next && next !== aiNoticeRef.current) showToast(AI_FALLBACK_TEXT[next].toast);
      aiNoticeRef.current = next;
      setAiNotice(next);
    },
    [showToast],
  );

  // Sorting queue: one email at a time, so you can watch them land.
  const nextToSort = state.emails.find((e) => e.status === "sorting")?.id ?? null;
  useEffect(() => {
    if (!hydrated || !nextToSort || inFlight.current) return;
    const email = stateRef.current.emails.find((e) => e.id === nextToSort);
    if (!email) return;
    inFlight.current = email.id;

    (async () => {
      let triage: Triage;
      try {
        const res = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: { from: email.from, subject: email.subject, body: email.body },
            handbook: stateRef.current.handbook,
            rules: stateRef.current.rules,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        triage = (await res.json()) as Triage;
      } catch {
        triage = {
          folder: "admin",
          draft: "",
          reasoning: "Couldn't reach the sorting service, so this was left for reception to check by hand.",
          source: "rules",
          redFlag: false,
        };
      }
      await new Promise((r) => setTimeout(r, 250)); // a beat, so the arrival is visible
      setMode(triage.source);
      noteAi(triage.source, triage.fallback);
      dispatch({ type: "triaged", id: email.id, triage });
      inFlight.current = null;
    })();
  }, [hydrated, nextToSort]);

  const send = useCallback(
    async (id: string) => {
      const email = stateRef.current.emails.find((e) => e.id === id);
      if (!email) return;
      const original = email.triage?.draft ?? "";
      const edited = email.reply ?? "";
      dispatch({ type: "sent", id });

      if (original && edited && original.trim() !== edited.trim()) {
        try {
          const res = await fetch("/api/learn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ original, edited }),
          });
          const data = (await res.json()) as { rule: string | null; source: "ai" | "rules"; fallback?: AiFallback };
          if (data.fallback) noteAi(data.source, data.fallback);
          if (data.rule) {
            dispatch({ type: "addRule", rule: { id: uid(), text: data.rule, learnedAt: new Date().toISOString(), source: data.source } });
            showToast(`Reply sent. Learned from your edit: ${data.rule}`);
            return;
          }
        } catch {
          /* learning is a bonus; the reply is still sent */
        }
      }
      showToast("Reply sent.");
    },
    [showToast, noteAi],
  );

  const sendTestEmails = useCallback(
    (tests: TestEmail[]) => {
      const now = Date.now();
      const emails: Email[] = tests.map((t, i) => ({
        id: uid(),
        from: t.from,
        subject: t.subject,
        body: t.body,
        receivedAt: new Date(now + i).toISOString(),
        status: "sorting",
        test: { id: t.id, label: t.label, expected: t.expected },
      }));
      dispatch({ type: "add", emails: emails.reverse() });
      showToast(tests.length === 1 ? `Sent "${tests[0].label}" to the inbox.` : `Sent ${tests.length} test emails to the inbox.`);
    },
    [showToast],
  );

  const sendCustomEmail = useCallback(
    (email: { from: Sender; subject: string; body: string }) => {
      dispatch({
        type: "add",
        emails: [{ ...email, id: uid(), receivedAt: new Date().toISOString(), status: "sorting" }],
      });
      showToast("Your email is in the inbox and being sorted.");
    },
    [showToast],
  );

  const api = useMemo<InboxApi>(
    () => ({
      ...state,
      hydrated,
      mode,
      aiNotice,
      toast,
      sortingCount: state.emails.filter((e) => e.status === "sorting").length,
      setView: (view) => dispatch({ type: "view", view }),
      select: (id) => dispatch({ type: "select", id }),
      setReply: (id, text) => dispatch({ type: "reply", id, text }),
      send,
      move: (id, folder) => dispatch({ type: "move", id, folder }),
      retriage: (id) => dispatch({ type: "retriage", id }),
      setHandbook: (text) => dispatch({ type: "handbook", text }),
      removeRule: (id) => dispatch({ type: "removeRule", id }),
      sendTestEmails,
      sendCustomEmail,
      reset: () => {
        dispatch({ type: "reset" });
        setMode(null);
        aiNoticeRef.current = null;
        setAiNotice(null);
        showToast("Demo reset to a fresh inbox.");
      },
    }),
    [state, hydrated, mode, aiNotice, toast, send, sendTestEmails, sendCustomEmail, showToast],
  );

  return <InboxContext.Provider value={api}>{children}</InboxContext.Provider>;
}

export function useInbox(): InboxApi {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInbox must be used inside <InboxProvider>");
  return ctx;
}
