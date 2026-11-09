import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { payInstalment } from "../../../lib/payments";
import { getToday } from "../../../lib/today";

const schema = z.object({
  instalmentId: z.string().min(1).max(100),
  outcome: z.enum(["success", "fail", "cancel"]),
  idempotencyKey: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  const auth = await requireSession("PARENT");
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const result = await payInstalment(db, {
    userId: auth.session.userId,
    ...parsed.data,
    today: getToday(),
  });

  switch (result.kind) {
    case "not_found":
    case "forbidden":
      // Same answer for both, so ids cannot be probed.
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    case "already_paid":
      return NextResponse.json({ error: "Already paid" }, { status: 409 });
    case "no_payment":
      return NextResponse.json({ ok: true, status: result.outcome === "fail" ? "failed" : "cancelled" });
    case "paid":
      return NextResponse.json({ ok: true, status: "paid", receiptId: result.receiptId });
  }
}