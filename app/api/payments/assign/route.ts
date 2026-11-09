import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "../../../../lib/auth";
import { assignPayment } from "../../../../lib/assign";
import { db } from "../../../../lib/db";
import { getToday } from "../../../../lib/today";

const schema = z.object({
  paymentId: z.string().min(1).max(100),
  instalmentId: z.string().min(1).max(100),
});

export async function POST(req: Request) {
  const auth = await requireSession("ACCOUNTS");
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const result = await assignPayment(db, { ...parsed.data, today: getToday() });
  switch (result.kind) {
    case "not_found":
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    case "already_assigned":
      return NextResponse.json({ error: "Payment is already assigned" }, { status: 409 });
    case "already_paid":
      return NextResponse.json({ error: "That instalment is already paid" }, { status: 409 });
    case "exceeds_balance":
      return NextResponse.json({ error: "Payment is more than the instalment balance" }, { status: 422 });
    case "ok":
      return NextResponse.json({ ok: true, receiptId: result.receiptId });
  }
}