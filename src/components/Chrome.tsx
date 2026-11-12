"use client";

import { FOLDERS } from "@/lib/folders";
import { CLINIC } from "@/lib/handbook";
import { Spinner } from "./bits";
import { AI_FALLBACK_TEXT, useInbox, type View } from "./InboxProvider";

export function TopBar() {
  const { mode, aiNotice, sortingCount, setView, reset } = useInbox();
  return (
    <header className="glass flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[20px] py-2 pr-2.5 pl-4 shadow-[0_8px_30px_rgb(30_60_70/0.1)]">
      <div className="flex items-center gap-2.5">
        <span className="grid size-[30px] place-items-center rounded-[9px] bg-teal text-sm font-bold text-white" aria-hidden="true">
          N
        </span>
        <div className="leading-tight">
          <p className="text-[15px] font-bold">{CLINIC.name}</p>
          <p className="text-xs text-muted">Inbox assistant demo, fictional clinic</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
        {sortingCount > 0 ? (
          <span className="pill bg-white text-teal border border-line-soft">
            <Spinner /> Sorting {sortingCount} {sortingCount === 1 ? "email" : "emails"}
          </span>
        ) : mode ? (
          <span className="pill bg-white text-muted border border-line-soft">
            {mode === "ai" ? "Sorting with AI (Llama via Groq)" : aiNotice ? AI_FALLBACK_TEXT[aiNotice].badge : "Sorting with built-in rules"}
          </span>
        ) : null}
      </div>

      <div className="ml-auto flex gap-2">
        <button type="button" className="btn btn-secondary" onClick={reset}>
          Reset demo
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setView({ kind: "tests" })}>
          Send test emails
        </button>
      </div>
    </header>
  );
}

function NavItem({ active, onClick, children, count, urgent }: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number; urgent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[42px] shrink-0 items-center justify-between gap-3 rounded-[10px] px-3 text-left text-sm transition-colors ${
        active ? "bg-teal/14 font-semibold" : "hover:bg-white/60"
      }`}
    >
      <span>{children}</span>
      {count ? (
        <span className={`pill ${urgent ? "bg-bad-bg text-bad" : "bg-white/80 text-muted"}`}>{count}</span>
      ) : null}
    </button>
  );
}

export function Sidebar() {
  const { emails, rules, view, setView } = useInbox();
  const isView = (v: View) => JSON.stringify(v) === JSON.stringify(view);
  const open = emails.filter((e) => e.status === "open" && e.triage);
  const sent = emails.filter((e) => e.status === "sent").length;

  return (
    <nav aria-label="Folders" className="glass flex gap-1 overflow-x-auto rounded-[20px] p-2.5 lg:flex-col lg:overflow-visible">
      {FOLDERS.map((f) => (
        <NavItem
          key={f.id}
          active={isView({ kind: "folder", folder: f.id })}
          onClick={() => setView({ kind: "folder", folder: f.id })}
          count={open.filter((e) => e.triage!.folder === f.id).length}
          urgent={f.id === "priority"}
        >
          {f.label}
        </NavItem>
      ))}
      <hr className="mx-2 my-1.5 hidden border-ink/10 lg:block" />
      <NavItem active={isView({ kind: "sent" })} onClick={() => setView({ kind: "sent" })} count={sent}>
        Sent
      </NavItem>
      <NavItem active={isView({ kind: "handbook" })} onClick={() => setView({ kind: "handbook" })} count={rules.length}>
        Clinic handbook
      </NavItem>
      <NavItem active={isView({ kind: "tests" })} onClick={() => setView({ kind: "tests" })}>
        Send test emails
      </NavItem>
    </nav>
  );
}

export function Toast() {
  const { toast } = useInbox();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      {toast ? (
        <p className="arrive pointer-events-auto max-w-xl rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-[0_10px_36px_rgb(30_60_70/0.25)]">
          {toast}
        </p>
      ) : null}
    </div>
  );
}
