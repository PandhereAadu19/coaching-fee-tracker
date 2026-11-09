import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { approveRefund, parseExitDate } from "../../../lib/refund-service";
import { getToday } from "../../../lib/today";

const schema = z.object({
  studentId: z.string().min(1).max(100),
  exitDate: z.string().min(10).max(10),
});

export async function POST(req: Request) {
  const auth = await requireSession("ACCOUNTS");
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  const exitDate = parsed.success ? parseExitDate(parsed.data.exitDate) : null;
  if (!parsed.success || !exitDate) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await approveRefund(db, {
    studentId: parsed.data.studentId,
    exitDate,
    today: getToday(),
  });

  switch (result.kind) {
    case "not_found":
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    case "no_plan":
      return NextResponse.json({ error: "Student has no fee plan" }, { status: 422 });
    case "already_exited":
    case "already_refunded":
      return NextResponse.json({ error: "A refund was already processed for this student" }, { status: 409 });
    case "ok":
      return NextResponse.json({ ok: true, refundId: result.refundId });
  }
}