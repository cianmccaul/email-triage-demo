import { folderLabel, type FolderId } from "@/lib/folders";
import type { Email } from "@/lib/types";

const FOLDER_STYLE: Record<FolderId, string> = {
  priority: "bg-bad-bg text-bad",
  therapist: "bg-violet-bg text-violet",
  admin: "bg-ok-bg text-ok",
  spam: "bg-line-soft text-muted",
};

export function FolderPill({ folder }: { folder: FolderId }) {
  return <span className={`pill ${FOLDER_STYLE[folder]}`}>{folderLabel(folder)}</span>;
}

export function SourcePill({ source }: { source: "ai" | "rules" }) {
  return (
    <span className="pill bg-well text-muted border border-line-soft">{source === "ai" ? "Sorted by AI" : "Sorted by built-in rules"}</span>
  );
}

/** For emails sent from the test panel: did it land where expected? */
export function TestResult({ email }: { email: Email }) {
  if (!email.test || !email.triage) return null;
  const ok = email.triage.folder === email.test.expected;
  return ok ? (
    <span className="pill bg-ok-bg text-ok">Test passed</span>
  ) : (
    <span className="pill bg-warn-bg text-warn">Expected {folderLabel(email.test.expected)}</span>
  );
}

export function Spinner() {
  return (
    <span
      className="inline-block size-3 animate-spin rounded-full border-2 border-teal/30 border-t-teal motion-reduce:animate-none"
      aria-hidden="true"
    />
  );
}

export function timeAgo(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "short" });
}
