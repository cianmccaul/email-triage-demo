import { describe, expect, it } from "vitest";
import { sortWithRules, hasRedFlag, firstName } from "@/lib/triage/rules";
import { TEST_EMAILS } from "@/lib/test-emails";
import { sampleInbox } from "@/lib/sample-inbox";

describe("rule-based sorter", () => {
  it.each(TEST_EMAILS.map((t) => [t.label, t] as const))("sorts test email \"%s\" into the expected folder", (_label, t) => {
    expect(sortWithRules(t).folder).toBe(t.expected);
  });

  const expectedSamples: Record<string, string> = {
    s1: "priority", s2: "admin", s3: "spam", s4: "therapist", s5: "admin", s6: "priority",
    s7: "admin", s8: "therapist", s9: "spam", s10: "admin", s11: "priority",
  };
  it.each(sampleInbox().map((e) => [e.subject, e] as const))("sorts sample email \"%s\"", (_subject, email) => {
    expect(sortWithRules(email).folder).toBe(expectedSamples[email.id]);
  });

  it("does not treat the word 'urgent' alone as a clinical priority", () => {
    const result = sortWithRules({
      from: { name: "Accounts", email: "a@example.com" },
      subject: "URGENT",
      body: "Urgent: please pay invoice 12.",
    });
    expect(result.folder).toBe("admin");
  });

  it("flags safety symptoms and tells the patient to get checked today", () => {
    const result = sortWithRules({
      from: { name: "Declan Farrell", email: "d@example.com" },
      subject: "Hand",
      body: "Two of my fingers are numb since yesterday.",
    });
    expect(result.redFlag).toBe(true);
    expect(result.folder).toBe("priority");
    expect(result.draft).toMatch(/GP|emergency/);
  });

  it("drafts nothing for spam", () => {
    const spam = TEST_EMAILS.find((t) => t.expected === "spam")!;
    expect(sortWithRules(spam).draft).toBe("");
  });

  it("uses real handbook prices in admin replies", () => {
    const result = sortWithRules({
      from: { name: "Orla Hayes", email: "o@example.com" },
      subject: "Price",
      body: "How much is an initial assessment?",
    });
    expect(result.draft).toContain("€80");
    expect(result.draft.startsWith("Hi Orla,")).toBe(true);
  });
});

describe("helpers", () => {
  it("detects red flags", () => {
    expect(hasRedFlag("my foot has gone numb")).toBe(true);
    expect(hasRedFlag("I can't put any weight on it")).toBe(true);
    expect(hasRedFlag("my back is better")).toBe(false);
  });

  it("greets people by first name and companies generically", () => {
    expect(firstName({ name: "Aoife Brennan", email: "" })).toBe("Aoife");
    expect(firstName({ name: "SEO Growth Team", email: "" })).toBe("there");
  });
});
