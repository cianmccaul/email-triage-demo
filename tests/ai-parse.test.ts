import { describe, expect, it } from "vitest";
import { parseAiTriage } from "@/lib/triage/ai";
import { normaliseFolder } from "@/lib/folders";
import { addedSentences, learnWithoutAi } from "@/lib/learn";

describe("parsing the AI's answer", () => {
  it("accepts valid JSON", () => {
    const r = parseAiTriage('{"folder":"admin","draft":"Hi Siobhan,","reasoning":"Price question."}');
    expect(r).toMatchObject({ folder: "admin", source: "ai" });
  });

  it("maps near-miss folder names onto real folders", () => {
    expect(parseAiTriage('{"folder":"Therapists","draft":"x","reasoning":"y"}')?.folder).toBe("therapist");
    expect(normaliseFolder("PRIORITY")).toBe("priority");
    expect(normaliseFolder("Admin folder")).toBe("admin");
  });

  it("pulls JSON out of a code fence", () => {
    expect(parseAiTriage('Sure!\n```json\n{"folder":"spam","draft":"","reasoning":"Sales pitch."}\n```')?.folder).toBe("spam");
  });

  it("rejects unknown folders and broken JSON so the rules can take over", () => {
    expect(parseAiTriage('{"folder":"marketing","draft":"","reasoning":""}')).toBeNull();
    expect(parseAiTriage("not json at all")).toBeNull();
  });

  it("never drafts a reply to spam, even if the model wrote one", () => {
    expect(parseAiTriage('{"folder":"spam","draft":"Hi!","reasoning":"x"}')?.draft).toBe("");
  });
});

describe("learning from staff edits", () => {
  const draft = "Hi Siobhan,\n\nOur initial assessment is €80.\n\nKind regards,\nReception";
  const edited = "Hi Siobhan,\n\nOur initial assessment is €80. Students get 10% off with a valid student card.\n\nKind regards,\nReception";

  it("finds the sentence staff added", () => {
    expect(addedSentences(draft, edited)).toEqual(["Students get 10% off with a valid student card."]);
  });

  it("turns it into a rule without AI", () => {
    expect(learnWithoutAi(draft, edited)).toContain("Students get 10% off");
  });

  it("learns nothing when nothing changed", () => {
    expect(learnWithoutAi(draft, draft)).toBeNull();
  });
});
