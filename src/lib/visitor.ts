import type { NextResponse } from "next/server";

/**
 * Who's asking, for the AI limits: an anonymous random id kept in a cookie,
 * and the IP address Vercel saw. Nothing else is stored.
 */
export type Visitor = { id: string; ip: string | null; isNew: boolean };

const COOKIE = "nb_visitor";
const ID = /^[A-Za-z0-9-]{8,64}$/;

export function visitorFrom(req: Request): Visitor {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  const existing = match && ID.test(match[1]) ? match[1] : null;
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip")?.trim() || null;
  return { id: existing ?? crypto.randomUUID(), ip, isNew: !existing };
}

/** Sets the visitor cookie on a response, the first time only. */
export function withVisitorCookie<T extends NextResponse>(res: T, visitor: Visitor): T {
  if (visitor.isNew) {
    res.cookies.set(COOKIE, visitor.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
