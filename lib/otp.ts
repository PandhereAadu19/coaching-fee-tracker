import { createHash, timingSafeEqual } from "node:crypto";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const MAX_OTP_ATTEMPTS = 5;

export function hashOtp(code: string, phone: string, secret = process.env.SESSION_SECRET ?? "") {
  return createHash("sha256").update(`${secret}:${phone}:${code}`).digest("hex");
}

export function verifyOtpHash(code: string, phone: string, hash: string, secret?: string) {
  const a = Buffer.from(hashOtp(code, phone, secret), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function canAttempt(attempts: number) {
  return attempts < MAX_OTP_ATTEMPTS;
}

/**
 * In-memory limiter. It resets when the server restarts and is per server instance,
 * which is fine for a demo. A real deployment would use Redis or the database.
 */
export function createRateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    check(key: string, now = Date.now()): boolean {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
  };
}

export const otpRequestLimiter = createRateLimiter(5, 15 * 60 * 1000);