"use client";

import { useState } from "react";
import { FOLDERS, folderLabel } from "@/lib/folders";
import { TEST_EMAILS, type TestEmail } from "@/lib/test-emails";
import { FolderPill, Spinner } from "./bits";
import { useInbox } from "./InboxProvider";

export function TestBench() {
  const { emails, sendTestEmails, setView, select } = useInbox();
  // Oldest first, so the table reads in the order the tests were sent.
  const results = emails.filter((e) => e.test).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const done = results.filter((e) => e.status !== "sorting" && e.triage);
  const passed = done.filter((e) => e.triage!.folder === e.test!.expected).length;

  const open = (id: string) => {
    const e = emails.find((x) => x.id === id);
    if (!e?.triage || e.status !== "open") return;
    setView({ kind: "folder", folder: e.triage.folder });
    select(id);
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="panel rounded-[22px] p-5 lg:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight">Send test emails</h1>
            <p className="mt-1 text-sm text-muted">
              Each email below says where it should land. Send them into the inbox and watch them get sorted. The ones marked
              &ldquo;Tricky&rdquo; are designed to catch a naive keyword filter out.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => sendTestEmails(TEST_EMAILS)}>
            Send all {TEST_EMAILS.length}
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-6 rounded-2xl bg-well p-4">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-base font-semibold">Results</h2>
              <span className="pill bg-white text-ink border border-line-soft">
                {passed} of {done.length} landed where expected
              </span>
              {done.length < results.length && (
                <span className="pill bg-white text-teal border border-line-soft">
                  <Spinner /> {results.length - done.length} still sorting
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="py-1.5 pr-4 font-semibold">Test</th>
                    <th className="py-1.5 pr-4 font-semibold">Expected</th>
                    <th className="py-1.5 pr-4 font-semibold">Landed in</th>
                    <th className="py-1.5 font-semibold">
                      <span className="sr-only">Result</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((e) => {
                    const landed = e.status !== "sorting" && e.triage;
                    const ok = landed && e.triage!.folder === e.test!.expected;
                    return (
                      <tr key={e.id} className="border-t border-line-soft">
                        <td className="py-2 pr-4">
                          <button type="button" className="text-left font-medium hover:underline disabled:no-underline" onClick={() => open(e.id)} disabled={!landed || e.status === "sent"}>
                            {e.test!.label}
                          </button>
                        </td>
                        <td className="py-2 pr-4">{folderLabel(e.test!.expected)}</td>
                        <td className="py-2 pr-4">{landed ? <FolderPill folder={e.triage!.folder} /> : <Spinner />}</td>
                        <td className="py-2">
                          {landed && (ok ? <span className="pill bg-ok-bg text-ok">Pass</span> : <span className="pill bg-warn-bg text-warn">Check</span>)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {FOLDERS.map((f) => (
          <section key={f.id} aria-labelledby={`tests-${f.id}`} className="glass rounded-[20px] p-4">
            <h2 id={`tests-${f.id}`} className="mb-3 flex items-center gap-2 text-base font-semibold">
              Should land in <FolderPill folder={f.id} />
            </h2>
            <ul className="flex flex-col gap-2">
              {TEST_EMAILS.filter((t) => t.expected === f.id).map((t) => (
                <TestCard key={t.id} test={t} onSend={() => sendTestEmails([t])} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <WriteYourOwn />
    </div>
  );
}

function TestCard({ test, onSend }: { test: TestEmail; onSend: () => void }) {
  const [showBody, setShowBody] = useState(false);
  return (
    <li className="rounded-2xl border border-line-soft bg-white p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {test.label}
            {test.tricky && <span className="pill bg-warn-bg text-warn">Tricky</span>}
          </p>
          <p className="mt-0.5 text-[13px] text-muted">{test.tests}</p>
        </div>
        <button type="button" className="btn btn-secondary min-h-9 px-3" onClick={onSend}>
          Send
        </button>
      </div>
      <button type="button" className="mt-2 text-xs font-semibold text-teal hover:underline" onClick={() => setShowBody((s) => !s)} aria-expanded={showBody}>
        {showBody ? "Hide email" : "Show email"}
      </button>
      {showBody && (
        <div className="mt-2 rounded-xl bg-well p-3 text-[13px]">
          <p className="font-semibold">{test.subject}</p>
          <p className="text-xs text-muted">From {test.from.name}</p>
          <p className="mt-1.5 leading-relaxed">{test.body}</p>
        </div>
      )}
    </li>
  );
}

function WriteYourOwn() {
  const { sendCustomEmail } = useInbox();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setError("Write a message so there's something to sort.");
      return;
    }
    setError(null);
    const sender = name.trim() || "Test Patient";
    sendCustomEmail({
      from: { name: sender, email: `${sender.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com` },
      subject: subject.trim() || "(no subject)",
      body: body.trim(),
    });
    setSubject("");
    setBody("");
  };

  return (
    <section aria-labelledby="own-title" className="panel rounded-[22px] p-5 lg:p-7">
      <h2 id="own-title" className="text-xl font-bold tracking-tight">
        Write your own
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted">Pretend you&apos;re a patient. Write anything and see where it lands.</p>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2" noValidate>
        <label className="text-sm font-semibold">
          Your name
          <input className="field mt-1.5 font-normal" value={name} onChange={(e) => setName(e.target.value)} placeholder="Test Patient" maxLength={80} />
        </label>
        <label className="text-sm font-semibold">
          Subject
          <input className="field mt-1.5 font-normal" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Sore knee after running" maxLength={150} />
        </label>
        <label className="text-sm font-semibold md:col-span-2">
          Message
          <textarea
            className="field mt-1.5 min-h-[120px] font-normal"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hi, my knee has been sore since my run on Sunday..."
            maxLength={3000}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "own-error" : undefined}
          />
        </label>
        {error && (
          <p id="own-error" className="text-sm font-semibold text-bad md:col-span-2">
            {error}
          </p>
        )}
        <div className="md:col-span-2">
          <button type="submit" className="btn btn-primary">
            Send to inbox
          </button>
        </div>
      </form>
    </section>
  );
}
