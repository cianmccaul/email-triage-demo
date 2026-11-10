"use client";

import { FOLDERS, folderLabel, type FolderId } from "@/lib/folders";
import type { Email } from "@/lib/types";
import { FolderPill, SourcePill, Spinner, TestResult, timeAgo } from "./bits";
import { useInbox } from "./InboxProvider";

export function FolderView({ folder }: { folder: FolderId }) {
  const { emails, selectedId, select } = useInbox();
  const sorting = emails.filter((e) => e.status === "sorting");
  const inFolder = emails.filter((e) => e.status === "open" && e.triage?.folder === folder);
  const selected = inFolder.find((e) => e.id === selectedId) ?? null;
  const meta = FOLDERS.find((f) => f.id === folder)!;

  return (
    <div className="panel flex min-h-[620px] flex-col overflow-hidden rounded-[22px] lg:flex-row">
      {/* List */}
      <section aria-label={`${meta.label} emails`} className={`flex flex-col border-line-soft lg:w-[360px] lg:shrink-0 lg:border-r ${selected ? "hidden lg:flex" : "flex"}`}>
        <div className="border-b border-line-soft px-5 pt-5 pb-4">
          <h1 className="text-2xl font-bold tracking-tight">{meta.label}</h1>
          <p className="mt-0.5 text-sm text-muted">{meta.description}</p>
        </div>

        {sorting.length > 0 && (
          <div className="flex items-center gap-2 border-b border-line-soft bg-well px-5 py-2.5 text-sm text-muted">
            <Spinner /> {sorting.length} new {sorting.length === 1 ? "email" : "emails"} being sorted
          </div>
        )}

        <ul className="flex-1 overflow-y-auto">
          {inFolder.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted">
              Nothing here right now.
              <br />
              Send some test emails to see how they sort.
            </li>
          )}
          {inFolder.map((e) => (
            <li key={e.id} className="arrive">
              <button
                type="button"
                onClick={() => select(e.id)}
                aria-current={e.id === selectedId ? "true" : undefined}
                className={`block w-full border-b border-line-soft px-5 py-3.5 text-left transition-colors ${
                  e.id === selectedId ? "bg-teal/10" : "hover:bg-well"
                }`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{e.from.name}</span>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(e.receivedAt)}</span>
                </span>
                <span className="mt-0.5 block truncate text-sm">{e.subject}</span>
                <span className="mt-0.5 block truncate text-[13px] text-muted">{e.body}</span>
                {(e.triage?.redFlag || e.test) && (
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {e.triage?.redFlag && <span className="pill bg-bad-bg text-bad">Safety check</span>}
                    <TestResult email={e} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Detail */}
      <section aria-label="Selected email" className={`min-w-0 flex-1 ${selected ? "block" : "hidden lg:block"}`}>
        {selected ? (
          <EmailDetail email={selected} onBack={() => select(null)} />
        ) : (
          <div className="grid h-full min-h-[300px] place-items-center p-10 text-center text-sm text-muted">
            <p>
              Pick an email to see why it landed in {folderLabel(folder)}
              {folder === "spam" ? "." : " and the reply the assistant drafted."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function EmailDetail({ email, onBack }: { email: Email; onBack: () => void }) {
  const { setReply, send, move, retriage } = useInbox();
  const t = email.triage!;
  const edited = (email.reply ?? "").trim() !== t.draft.trim();

  return (
    <article className="flex h-full flex-col gap-5 p-5 lg:p-7">
      <button type="button" onClick={onBack} className="btn btn-secondary self-start lg:hidden">
        Back to list
      </button>

      <header>
        <h2 className="text-xl font-bold tracking-tight">{email.subject}</h2>
        <p className="mt-1 text-sm text-muted">
          {email.from.name} &lt;{email.from.email}&gt;, {timeAgo(email.receivedAt)}
        </p>
      </header>

      {/* Why it's here */}
      <div className="rounded-2xl bg-well p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Why it&apos;s in</span>
          <FolderPill folder={t.folder} />
          <SourcePill source={t.source} />
          <TestResult email={email} />
        </div>
        <p className="text-sm">{t.reasoning}</p>
        {email.test && (
          <p className="mt-2 text-xs text-muted">
            Test email: &ldquo;{email.test.label}&rdquo;, expected in {folderLabel(email.test.expected)}.
          </p>
        )}
      </div>

      {t.redFlag && (
        <p className="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad">
          <strong>Safety check:</strong> this mentions a symptom that needs a doctor today, so the draft tells them to contact their GP or emergency department first.
        </p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Their message</h3>
        <p className="rounded-2xl border border-line-soft p-4 text-sm leading-relaxed whitespace-pre-wrap">{email.body}</p>
      </div>

      {t.folder === "spam" ? (
        <p className="text-sm text-muted">No reply drafted for spam.</p>
      ) : (
        <div className="flex flex-col">
          <label htmlFor={`reply-${email.id}`} className="mb-2 flex items-center justify-between text-sm font-semibold">
            <span>Draft reply</span>
            <span className="text-xs font-normal text-muted">
              {edited ? "Edited. The assistant will learn from your changes when you send." : "Edit anything before sending."}
            </span>
          </label>
          <textarea
            id={`reply-${email.id}`}
            className="field min-h-[220px] leading-relaxed"
            value={email.reply ?? ""}
            onChange={(e) => setReply(email.id, e.target.value)}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {t.folder !== "spam" && (
          <button type="button" className="btn btn-primary" onClick={() => send(email.id)} disabled={!email.reply?.trim()}>
            Send reply
          </button>
        )}
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="sr-only sm:not-sr-only">Move to</span>
          <select
            className="field min-h-11 w-auto py-2"
            value={t.folder}
            onChange={(e) => move(email.id, e.target.value as FolderId)}
            aria-label="Move to folder"
          >
            {FOLDERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-secondary" onClick={() => retriage(email.id)}>
          Sort again
        </button>
      </div>
    </article>
  );
}
