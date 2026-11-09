import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { OTP_TTL_MS, hashOtp, otpRequestLimiter } from "../../../../lib/otp";

const schema = z.object({ phone: z.string().regex(/^\d{10}$/) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid 10 digit phone number" }, { status: 400 });
  }
  const { phone } = parsed.data;

  if (!otpRequestLimiter.check(phone)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  // Same response whether or not the phone exists, so numbers cannot be probed.
  const user = await db.user.findUnique({ where: { phone } });
  if (user) {
    const code = process.env.MOCK_OTP ?? "123456";
    await db.otpCode.deleteMany({ where: { phone } });
    await db.otpCode.create({
      data: { phone, codeHash: hashOtp(code, phone), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
  }
  return NextResponse.json({ ok: true });
}