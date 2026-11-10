"use client";

import { useEffect, useState } from "react";
import { DEFAULT_HANDBOOK } from "@/lib/handbook";
import { FolderPill, timeAgo } from "./bits";
import { useInbox } from "./InboxProvider";

export function SentView() {
  const { emails } = useInbox();
  const sent = emails.filter((e) => e.status === "sent").sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""));

  return (
    <section className="panel rounded-[22px] p-5 lg:p-7">
      <h1 className="text-2xl font-bold tracking-tight">Sent</h1>
      <p className="mt-1 mb-5 text-sm text-muted">Replies sent from this demo. Nothing actually leaves the browser.</p>
      {sent.length === 0 ? (
        <p className="rounded-2xl bg-well p-6 text-center text-sm text-muted">No replies sent yet. Open an email, edit the draft if you like, and press Send reply.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sent.map((e) => (
            <li key={e.id} className="rounded-2xl border border-line-soft p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">To {e.from.name}</p>
                {e.triage && <FolderPill folder={e.triage.folder} />}
                <span className="ml-auto text-xs text-muted">{e.sentAt ? timeAgo(e.sentAt) : ""}</span>
              </div>
              <p className="mt-0.5 text-sm text-muted">Re: {e.subject}</p>
              <p className="mt-3 rounded-xl bg-well p-3 text-sm leading-relaxed whitespace-pre-wrap">{e.reply}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function HandbookView() {
  const { handbook, setHandbook, rules, removeRule } = useInbox();
  const [draft, setDraft] = useState(handbook);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(handbook), [handbook]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="panel rounded-[22px] p-5 lg:p-7">
        <h1 className="text-2xl font-bold tracking-tight">Clinic handbook</h1>
        <p className="mt-1 mb-4 text-sm text-muted">
          The facts the AI is allowed to use in replies. Change a price or opening time here and new drafts will use it.
        </p>
        <label htmlFor="handbook" className="sr-only">
          Clinic handbook
        </label>
        <textarea
          id="handbook"
          className="field min-h-[440px] font-mono text-[13px] leading-relaxed"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setSaved(false);
          }}
          maxLength={8000}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setHandbook(draft);
              setSaved(true);
            }}
            disabled={draft === handbook}
          >
            Save handbook
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setDraft(DEFAULT_HANDBOOK)}>
            Restore original
          </button>
          <span className="text-sm text-muted" aria-live="polite">
            {saved ? "Saved. New emails will use this." : ""}
          </span>
        </div>
        <p className="mt-3 text-xs text-muted">The built-in rules sorter uses fixed clinic facts. Edits here take effect when sorting with AI.</p>
      </section>

      <section className="glass rounded-[22px] p-5 lg:p-6">
        <h2 className="text-xl font-bold tracking-tight">Learned from your edits</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          When you change a draft before sending, the assistant works out what you added and follows it next time.
        </p>
        {rules.length === 0 ? (
          <div className="rounded-2xl bg-white/70 p-4 text-sm text-muted">
            <p className="font-semibold text-ink">Nothing learned yet. Try this:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Open Siobhan&apos;s email in Admin.</li>
              <li>Add a line to the draft, like &ldquo;Students get 10% off with a valid student card.&rdquo;</li>
              <li>Press Send reply, then come back here.</li>
            </ol>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rules.map((r) => (
              <li key={r.id} className="flex items-start gap-3 rounded-2xl bg-white p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{r.text}</p>
                  <p className="mt-1 text-xs text-muted">
                    {r.source === "ai" ? "Worked out by AI" : "Picked out by built-in rules"}, {timeAgo(r.learnedAt)}
                  </p>
                </div>
                <button type="button" className="text-xs font-semibold text-bad hover:underline" onClick={() => removeRule(r.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
