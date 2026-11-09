import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { attachSession } from "../../../../lib/auth";
import { canAttempt, verifyOtpHash } from "../../../../lib/otp";
import { signSession } from "../../../../lib/session-token";

const schema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  code: z.string().regex(/^\d{6}$/),
});

const invalid = () => NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the 6 digit code" }, { status: 400 });
  const { phone, code } = parsed.data;

  const record = await db.otpCode.findFirst({ where: { phone }, orderBy: { expiresAt: "desc" } });
  if (!record || record.expiresAt < new Date()) return invalid();
  if (!canAttempt(record.attempts)) {
    return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
  }

  await db.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
  if (!verifyOtpHash(code, phone, record.codeHash)) return invalid();

  const user = await db.user.findUnique({ where: { phone } });
  if (!user) return invalid();

  await db.otpCode.deleteMany({ where: { phone } });
  const token = await signSession({ userId: user.id, role: user.role });
  const res = NextResponse.json({
    ok: true,
    role: user.role,
    consentNeeded: user.role === "PARENT" && !user.consentAt,
  });
  attachSession(res, token);
  return res;
}