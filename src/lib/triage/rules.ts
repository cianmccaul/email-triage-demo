import type { FolderId } from "../folders";
import { CLINIC } from "../handbook";
import type { Sender, Triage } from "../types";

/**
 * The built-in sorter. It runs when no AI key is set or the AI call fails,
 * so the inbox always gets sorted. It also supplies the red-flag check,
 * which runs on every email whichever sorter is used.
 */

/** Symptoms that need a GP or A&E today. Always forces Priority. */
const RED_FLAGS: RegExp[] = [
  /\bnumb(ness)?\b/,
  /\b(weak|weakness)\b.*\b(arm|leg|hand|grip|foot)\b|\b(arm|leg|hand|grip|foot)\b.*\b(weak|weakness)\b/,
  /\bchest pain\b/,
  /\b(bladder|bowel)\b/,
  /\bcan(?:'|no)?t (put|take) (any )?weight\b/,
  /\b(broken|fracture[d]?)\b/,
];

type Keywords = Record<Exclude<FolderId, "spam"> | "spam", [RegExp, number][]>;

const KEYWORDS: Keywords = {
  spam: [
    [/\bunsubscribe\b|\breply stop\b/, 3],
    [/\bseo\b|\bbacklinks?\b|\bpage 1\b|\branking\b/, 3],
    [/\bcongratulations\b|\bwinner\b|\bprize\b|\bfree ipad\b/, 3],
    [/\blimited time\b|\bclick here\b|\bguarantee(d)?\b/, 2],
    [/\bcrypto\b|\binvestment opportunity\b|\bguest post\b/, 3],
  ],
  // Symptoms only. Urgency words are scored separately below.
  priority: [
    [/\bsharp pain\b|\bsevere\b|\bagony\b|\bcan(?:'|no)?t (move|walk|stand|turn)\b|\bbarely stand\b/, 3],
    [/\bswollen\b|\bswelling\b|\bbruised\b|\bfell\b|\bcame off\b|\binjur(y|ed)\b|\bjust went\b|\btwisted\b|\bwent over on\b/, 2],
    [/\bpins and needles\b|\bgetting worse\b/, 2],
  ],
  therapist: [
    [/\bexercises?\b|\bstretch(es|ing)?\b|\bclamshells?\b|\brehab\b|\bprogramme\b/, 3],
    [/\bmy (physio|therapist)\b|\bsarah\b|\bmark\b|\blucy\b/, 1],
    [/\bsore after\b|\bafter (my|the) (session|massage|treatment)\b|\bis that normal\b/, 3],
    [/\bshould i (keep|stop|continue)\b/, 2],
  ],
  admin: [
    [/\bhow much\b|\bprice\b|\bcost\b|\bfee\b/, 3],
    [/\bvhi\b|\blaya\b|\birish life\b|\binsurance\b|\bclaim\b/, 3],
    [/\breschedul\w*\b|\bmove my\b|\bcancel\w*\b|\bbook(ing)?\b|\bappointment\b/, 2],
    [/\breceipts?\b|\binvoices?\b/, 3],
    [/\bvouchers?\b|\bgift\b/, 3],
    [/\bopening hours\b|\bopen on\b|\bparking\b|\bslot\b/, 3],
    [/\bthank you\b|\bthanks for all\b/, 1],
  ],
};

export function hasRedFlag(text: string): boolean {
  const t = text.toLowerCase();
  return RED_FLAGS.some((re) => re.test(t));
}

export function scoreFolders(text: string): Record<FolderId, number> {
  const t = text.toLowerCase();
  const scores = { priority: 0, therapist: 0, admin: 0, spam: 0 } as Record<FolderId, number>;
  for (const folder of Object.keys(KEYWORDS) as FolderId[]) {
    for (const [re, weight] of KEYWORDS[folder]) if (re.test(t)) scores[folder] += weight;
  }
  // "Urgent" or "today" only make it more urgent when there's an actual symptom.
  // An "URGENT: invoice overdue" email is still admin.
  if (scores.priority > 0 && URGENCY.test(t)) scores.priority += 2;
  return scores;
}

const URGENCY = /\burgent(ly)?\b|\basap\b|\bemergency\b|\btoday\b|\bthis morning\b|\bright now\b|\btomorrow\b/;

export function firstName(sender: Sender): string {
  const first = sender.name.trim().split(/\s+/)[0] ?? "";
  // Company-style senders ("SEO Growth Team") don't get a first name.
  return /^[A-Z][a-z'’-]+$/.test(first) ? first : "there";
}

export function sortWithRules(email: { from: Sender; subject: string; body: string }): Triage {
  const text = `${email.subject}\n${email.body}`;

  if (hasRedFlag(text)) {
    return {
      folder: "priority",
      redFlag: true,
      source: "rules",
      reasoning: "Describes a symptom on the safety list (such as numbness, weakness or not being able to bear weight), so it goes straight to Priority with advice to get checked today.",
      draft: draftFor("priority", email.from, text, true),
    };
  }

  const scores = scoreFolders(text);
  let folder: FolderId = "admin"; // general questions default to reception
  let best = 0;
  for (const id of ["spam", "priority", "therapist", "admin"] as FolderId[]) {
    if (scores[id] > best) {
      best = scores[id];
      folder = id;
    }
  }

  return {
    folder,
    redFlag: false,
    source: "rules",
    reasoning: REASONS[folder](best),
    draft: draftFor(folder, email.from, text, false),
  };
}

const REASONS: Record<FolderId, (score: number) => string> = {
  priority: () => "Mentions a new injury or severe pain and asks to be seen soon.",
  therapist: () => "A clinical question about exercises or how they're responding to treatment, so it's best answered by their therapist.",
  admin: (score) =>
    score > 0
      ? "About prices, bookings, insurance, receipts or vouchers, which reception can answer."
      : "A general question with no clinical urgency, so it goes to reception.",
  spam: () => "Looks like marketing or a scam: sales language, prizes or an unsubscribe line.",
};

function draftFor(folder: FolderId, from: Sender, text: string, redFlag: boolean): string {
  if (folder === "spam") return "";
  const t = text.toLowerCase();
  const hi = `Hi ${firstName(from)},`;
  const paragraphs: string[] = [];

  if (folder === "priority") {
    if (redFlag) {
      paragraphs.push(
        "Thanks for getting in touch. Some of what you describe needs to be checked by a doctor today, so please contact your GP or go to your nearest emergency department now.",
        "Once you've been seen, we'd be glad to help with your recovery. Reply here or call us and we'll find you the next available appointment.",
      );
    } else {
      paragraphs.push(
        "Sorry to hear you're in so much pain. We'll do our best to see you as soon as possible, and we'll call you shortly with the first available appointment.",
        "In the meantime, keep moving gently within what's comfortable and avoid heavy lifting. If you develop numbness, weakness or any change in bladder or bowel control, please contact your GP or the emergency department straight away.",
      );
    }
  }

  if (folder === "therapist") {
    paragraphs.push(
      "Thanks for the update, that's really useful to know. I've passed your message on to your therapist and they'll get back to you directly.",
      "Until you hear from them, ease off anything that's making it worse, and keep going with the rest as normal.",
    );
  }

  if (folder === "admin") {
    if (/how much|price|cost|fee|assessment/.test(t)) {
      paragraphs.push(`Our prices are ${CLINIC.prices.initial}, ${CLINIC.prices.followUp}, and ${CLINIC.prices.massage}.`);
    }
    if (/vhi|laya|irish life|insurance|claim/.test(t)) {
      paragraphs.push(`We're registered with ${CLINIC.insurers}. You pay on the day and claim it back, and we're happy to send receipts for your claim.`);
    }
    if (/receipt|invoice/.test(t) && !/vhi|laya|irish life|insurance/.test(t)) {
      paragraphs.push("I'll email your receipts over to you today.");
    } else if (/receipt|invoice/.test(t)) {
      paragraphs.push("I'll email those receipts over to you today.");
    }
    if (/reschedul|move my|cancel/.test(t)) {
      paragraphs.push(`No problem at all. I'll send you some times for next week shortly. Just so you know, ${CLINIC.cancellation.charAt(0).toLowerCase()}${CLINIC.cancellation.slice(1)}`);
    }
    if (/voucher|gift/.test(t)) {
      paragraphs.push("We do! Gift vouchers come in any amount. You can buy one online and it's emailed straight away, so it's ready for the birthday.");
    }
    if (/opening hours|open on/.test(t)) {
      paragraphs.push(`We're open ${CLINIC.hours}.`);
    }
    if (paragraphs.length === 0) {
      paragraphs.push("Thanks for your message. A member of our team will get back to you shortly.");
    }
  }

  return [hi, "", paragraphs.join("\n\n"), "", CLINIC.signOff].join("\n");
}
