import { NextResponse } from "next/server";
import { requireSession } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { runReminderJob } from "../../../../lib/reminder-job";
import { getToday } from "../../../../lib/today";

export async function POST() {
  const auth = await requireSession("ACCOUNTS");
  if (!auth.ok) return auth.response;
  const summary = await runReminderJob(db, getToday());
  return NextResponse.json({ ok: true, summary });
}