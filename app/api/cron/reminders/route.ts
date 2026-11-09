import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { runReminderJob } from "../../../../lib/reminder-job";
import { runRiskJob } from "../../../../lib/risk-job";
import { safeEqual } from "../../../../lib/secure";
import { getToday } from "../../../../lib/today";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const today = getToday();
  const reminders = await runReminderJob(db, today);
  const risk = await runRiskJob(db, today);
  return NextResponse.json({ ok: true, reminders, risk });
}