import { SignJWT, jwtVerify } from "jose";

export type Role = "PARENT" | "ACCOUNTS";
export interface SessionPayload {
  userId: string;
  role: Role;
}

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

function key(secret?: string) {
  const s = secret ?? process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET is missing or too short");
  return new TextEncoder().encode(s);
}

export async function signSession(
  payload: SessionPayload,
  opts: { secret?: string; expiresInSeconds?: number } = {}
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + (opts.expiresInSeconds ?? SESSION_MAX_AGE);
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key(opts.secret));
}

/** Returns the session, or null for any invalid, expired or tampered token. */
export async function verifySession(
  token: string,
  opts: { secret?: string } = {}
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key(opts.secret), { algorithms: ["HS256"] });
    const role = payload.role;
    if (typeof payload.sub !== "string") return null;
    if (role !== "PARENT" && role !== "ACCOUNTS") return null;
    return { userId: payload.sub, role };
  } catch {
    return null;
  }
}