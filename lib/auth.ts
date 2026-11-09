import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifySession,
  type Role,
  type SessionPayload,
} from "./session-token";
import { checkRole } from "./roles";

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function attachSession(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Use at the top of every route handler:
 *  const auth = await requireSession("ACCOUNTS"); if (!auth.ok) return auth.response; */
export async function requireSession(role: Role) {
  const session = await getSession();
  const verdict = checkRole(session, role);
  if (verdict === "unauthenticated") {
    return { ok: false as const, response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  if (verdict === "forbidden") {
    return { ok: false as const, response: NextResponse.json({ error: "Not allowed" }, { status: 403 }) };
  }
  return { ok: true as const, session: session as SessionPayload };
}