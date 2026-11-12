import { NextResponse } from "next/server";
import { z } from "zod";
import { aiAccess } from "@/lib/ai-limits";
import { learnFromEdit } from "@/lib/learn";
import { visitorFrom, withVisitorCookie } from "@/lib/visitor";

const Body = z.object({
  original: z.string().max(4000),
  edited: z.string().max(4000),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const visitor = visitorFrom(req);
  const result = await learnFromEdit(parsed.data.original, parsed.data.edited, () => aiAccess(visitor));
  return withVisitorCookie(NextResponse.json(result), visitor);
}
