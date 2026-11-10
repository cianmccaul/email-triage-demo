import type { Email } from "./types";

/**
 * A morning's inbox for a fictional clinic. Every name and email address
 * here is made up. None of it is real patient data.
 */
type Sample = Pick<Email, "id" | "from" | "subject" | "body"> & { minutesAgo: number };

const SAMPLES: Sample[] = [
  {
    id: "s1",
    minutesAgo: 6,
    from: { name: "Aoife Brennan", email: "aoife.brennan@example.com" },
    subject: "Back went this morning",
    body: "Hi, I bent down to lift my son this morning and my lower back just went. I can barely stand up straight and there's a sharp pain going down my left leg. Is there any chance someone could see me today? Thanks, Aoife",
  },
  {
    id: "s2",
    minutesAgo: 14,
    from: { name: "Siobhan Murphy", email: "siobhan.m@example.com" },
    subject: "Prices and insurance",
    body: "Hello, how much is an initial assessment? And do you take VHI? I've had a sore shoulder for a few weeks and want to get it looked at. Siobhan",
  },
  {
    id: "s3",
    minutesAgo: 22,
    from: { name: "SEO Growth Team", email: "hello@rank-boost-agency.example" },
    subject: "Get your clinic to page 1 of Google, guaranteed!",
    body: "Dear business owner, we noticed your website is not ranking. Our SEO experts guarantee page 1 results in 30 days with our backlinks package. Limited time offer, reply now. To unsubscribe reply STOP.",
  },
  {
    id: "s4",
    minutesAgo: 35,
    from: { name: "Niamh Kelly", email: "niamhkelly@example.com" },
    subject: "Question about my hip exercises",
    body: "Hi, Sarah gave me some hip exercises last week. The clamshells are making my knee click a bit. Should I keep going with them or stop until my next session? Thanks, Niamh",
  },
  {
    id: "s5",
    minutesAgo: 48,
    from: { name: "Eoin Byrne", email: "eoin.byrne@example.com" },
    subject: "Need to move Thursday",
    body: "Hi there, something has come up at work and I need to reschedule my Thursday 4pm appointment to sometime next week if possible. Sorry for the hassle! Eoin",
  },
  {
    id: "s6",
    minutesAgo: 61,
    from: { name: "Declan Farrell", email: "dec.farrell@example.com" },
    subject: "Pins and needles getting worse",
    body: "Hello, I've had pins and needles in my right hand for about a week but since yesterday two of my fingers are numb and my grip feels weak. Should I come in or is this something else?",
  },
  {
    id: "s7",
    minutesAgo: 75,
    from: { name: "Grace O'Neill", email: "grace.oneill@example.com" },
    subject: "Receipts for health insurance",
    body: "Hi, could you send me receipts for my last three sessions? I'm putting in a claim with Laya. Many thanks, Grace",
  },
  {
    id: "s8",
    minutesAgo: 92,
    from: { name: "Patrick Doyle", email: "p.doyle@example.com" },
    subject: "Sore after massage",
    body: "Hi, I had a deep tissue massage with Lucy on Tuesday and my calves are still quite sore. Is that normal and how long should it last? Pat",
  },
  {
    id: "s9",
    minutesAgo: 110,
    from: { name: "Prize Department", email: "winner@free-prize-now.example" },
    subject: "Congratulations! You've been selected",
    body: "Congratulations! Your business has been selected to receive a FREE iPad. Click here to claim your prize before midnight. Winner notification #88213.",
  },
  {
    id: "s10",
    minutesAgo: 131,
    from: { name: "Ciara Ryan", email: "ciara.ryan@example.com" },
    subject: "Gift voucher",
    body: "Hi, do you do gift vouchers? I'd love to get one for my mum's birthday for a massage. Ciara",
  },
  {
    id: "s11",
    minutesAgo: 155,
    from: { name: "Conor Walsh", email: "conorwalsh@example.com" },
    subject: "Knee after a fall",
    body: "Hi, I came off my bike yesterday evening and my knee is really swollen today. I can't put any weight on it. Can you help or should I go somewhere else first?",
  },
];

/** Build a fresh inbox with times relative to now, all waiting to be sorted. */
export function sampleInbox(now = Date.now()): Email[] {
  return SAMPLES.map(({ minutesAgo, ...email }) => ({
    ...email,
    receivedAt: new Date(now - minutesAgo * 60_000).toISOString(),
    status: "sorting",
  }));
}
