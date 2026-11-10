import type { FolderId } from "./folders";
import type { Sender } from "./types";

/**
 * Test emails you can send into the demo inbox from the "Send test emails" panel.
 * Each one says where it *should* land and what it's testing, so you can see
 * the sorter get the easy ones right and handle the tricky ones.
 * All names and addresses are made up.
 */
export interface TestEmail {
  id: string;
  /** What this case shows, in a few words. */
  label: string;
  /** Why it's interesting. */
  tests: string;
  expected: FolderId;
  tricky?: boolean;
  from: Sender;
  subject: string;
  body: string;
}

export const TEST_EMAILS: TestEmail[] = [
  // Priority
  {
    id: "t-ankle",
    label: "Sports injury",
    tests: "A new injury with swelling goes to Priority.",
    expected: "priority",
    from: { name: "Ronan Keane", email: "ronan.keane@example.com" },
    subject: "Twisted ankle at football",
    body: "Hi, I went over on my ankle at football last night. It's swollen and bruised this morning and really sore to walk on. Can I get an appointment this week?",
  },
  {
    id: "t-hidden-numb",
    label: "Hidden red flag",
    tests: "A casual message that mentions numbness is still treated as urgent, with advice to see a GP today.",
    expected: "priority",
    tricky: true,
    from: { name: "Sinead Quinn", email: "sinead.q@example.com" },
    subject: "Quick one",
    body: "Hiya, bit of a weird one. Since the gym on Saturday my left foot has gone numb on and off. It's probably nothing! Also, is there parking near you?",
  },
  {
    id: "t-neck",
    label: "Severe pain",
    tests: "Severe pain and asking to be seen soon goes to Priority.",
    expected: "priority",
    from: { name: "Mary Gallagher", email: "mary.gallagher@example.com" },
    subject: "Neck pain, can't turn my head",
    body: "Woke up with severe neck pain and I can't turn my head to the left at all. Is there any chance of an appointment today or tomorrow?",
  },

  // Therapists
  {
    id: "t-running",
    label: "Return to running",
    tests: "A recovery question for their physio goes to Therapists.",
    expected: "therapist",
    from: { name: "Luke Dunne", email: "luke.dunne@example.com" },
    subject: "Can I run yet?",
    body: "Hi, Mark said to rest my ankle for two weeks and that's up on Friday. Should I start with short runs or keep doing the exercises first?",
  },
  {
    id: "t-stretch",
    label: "Exercise question",
    tests: "Questions about home exercises go to the therapist, not reception.",
    expected: "therapist",
    from: { name: "Emma Nolan", email: "emma.nolan@example.com" },
    subject: "Stretches",
    body: "Hello, how many times a day should I be doing the hamstring stretches Sarah showed me? I wrote down twice but I'm not sure.",
  },

  // Admin
  {
    id: "t-urgent-invoice",
    label: "\"Urgent\" but not clinical",
    tests: "The word \"urgent\" alone doesn't make it Priority. An overdue invoice is admin.",
    expected: "admin",
    tricky: true,
    from: { name: "Accounts, Supply Co", email: "accounts@supply-co.example" },
    subject: "URGENT: invoice overdue",
    body: "Hello, this is an urgent reminder that invoice 4471 for your treatment couch covers is now 14 days overdue. Please arrange payment at your earliest convenience.",
  },
  {
    id: "t-better-cancel",
    label: "Mentions pain, means admin",
    tests: "Talks about their back, but they're cancelling because it's better. That's admin, not Priority.",
    expected: "admin",
    tricky: true,
    from: { name: "Kevin Moran", email: "kevin.moran@example.com" },
    subject: "Cancel Friday",
    body: "Hi, good news, my back is loads better so I'd like to cancel my appointment on Friday. Thanks for all the help!",
  },
  {
    id: "t-saturday",
    label: "Opening hours",
    tests: "Casual Irish phrasing still gets understood.",
    expected: "admin",
    from: { name: "Dara Kavanagh", email: "dara.k@example.com" },
    subject: "Saturday?",
    body: "Howya, are you open on Saturday mornings? Any chance of a slot this weekend?",
  },
  {
    id: "t-irishlife",
    label: "Insurance",
    tests: "Insurance and price questions go to reception with the handbook's real prices.",
    expected: "admin",
    from: { name: "Orla Hayes", email: "orla.hayes@example.com" },
    subject: "Irish Life cover",
    body: "Hi, I'm with Irish Life. Can I claim back the cost of a sports massage, and how much is one?",
  },
  {
    id: "t-thanks",
    label: "Thank-you note",
    tests: "Nothing urgent or clinical defaults to reception.",
    expected: "admin",
    from: { name: "Bridget Lynch", email: "bridget.lynch@example.com" },
    subject: "Thank you!",
    body: "Just wanted to say a huge thank you to everyone. I was able to walk the whole Howth cliff path at the weekend!",
  },

  // Spam
  {
    id: "t-partnership",
    label: "Polite spam",
    tests: "Spam that doesn't look like spam at first: a \"partnership\" pitch.",
    expected: "spam",
    tricky: true,
    from: { name: "Jessica, Growth Partners", email: "jessica@growth-partners.example" },
    subject: "Partnership opportunity",
    body: "Hi there, I'd love to explore a partnership. We place sponsored guest posts on top health blogs to boost your ranking. Can I send over our rates? If you'd rather not hear from me, just reply unsubscribe.",
  },
  {
    id: "t-crypto",
    label: "Scam",
    tests: "An obvious scam goes straight to Spam with no reply drafted.",
    expected: "spam",
    from: { name: "Investment Desk", email: "desk@quick-returns.example" },
    subject: "Double your money in 7 days",
    body: "Exclusive crypto investment opportunity for business owners. Guaranteed returns. Click here to secure your spot today.",
  },
];
