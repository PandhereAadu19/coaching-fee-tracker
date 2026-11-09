import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { requireSession } from "../../../../lib/auth";

const schema = z.object({ accepted: z.literal(true) });

export async function POST(req: Request) {
  const auth = await requireSession("PARENT");
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Consent is required" }, { status: 400 });

  await db.user.update({ where: { id: auth.session.userId }, data: { consentAt: new Date() } });
  return NextResponse.json({ ok: true });
}