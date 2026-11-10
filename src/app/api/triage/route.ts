import { NextResponse } from "next/server";
import { z } from "zod";
import { triageEmail } from "@/lib/triage";

const Body = z.object({
  email: z.object({
    from: z.object({ name: z.string().min(1).max(120), email: z.string().max(200) }),
    subject: z.string().max(200),
    body: z.string().min(1).max(5000),
  }),
  handbook: z.string().max(8000),
  rules: z
    .array(z.object({ id: z.string(), text: z.string().max(300), learnedAt: z.string(), source: z.enum(["ai", "rules"]) }))
    .max(30)
    .default([]),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { email, handbook, rules } = parsed.data;
  const triage = await triageEmail(email, handbook, rules);
  return NextResponse.json(triage);
}
