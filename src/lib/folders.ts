/**
 * The single list of folders. The API, the sorter, the AI prompt and the UI
 * all read from here, so a folder can never be spelled two different ways.
 */
export const FOLDERS = [
  {
    id: "priority",
    label: "Priority",
    description: "New injuries, severe or worsening pain, anything urgent",
  },
  {
    id: "therapist",
    label: "Therapists",
    description: "Clinical questions about exercises, treatment or recovery",
  },
  {
    id: "admin",
    label: "Admin",
    description: "Prices, bookings, receipts, insurance, vouchers, hours",
  },
  {
    id: "spam",
    label: "Spam",
    description: "Marketing, sales pitches and junk",
  },
] as const;

export type FolderId = (typeof FOLDERS)[number]["id"];

export const FOLDER_IDS = FOLDERS.map((f) => f.id) as [FolderId, ...FolderId[]];

export function folderLabel(id: FolderId): string {
  return FOLDERS.find((f) => f.id === id)?.label ?? id;
}

/**
 * Language models don't always use the exact id we asked for
 * ("Therapists", "THERAPIST", "Admin folder"...). Map anything close
 * onto a real folder, or return null so the caller can fall back.
 */
export function normaliseFolder(value: unknown): FolderId | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v.startsWith("prior") || v === "urgent") return "priority";
  if (v.startsWith("therap") || v.startsWith("clinic")) return "therapist";
  if (v.startsWith("admin") || v.startsWith("reception")) return "admin";
  if (v.startsWith("spam") || v.startsWith("junk")) return "spam";
  return null;
}
