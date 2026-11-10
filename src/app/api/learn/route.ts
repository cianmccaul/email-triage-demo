import { NextResponse } from "next/server";
import { z } from "zod";
import { learnFromEdit } from "@/lib/learn";

const Body = z.object({
  original: z.string().max(4000),
  edited: z.string().max(4000),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = await learnFromEdit(parsed.data.original, parsed.data.edited);
  return NextResponse.json(result);
}
