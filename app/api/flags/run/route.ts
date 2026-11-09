import { NextResponse } from "next/server";
import { requireSession } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { runRiskJob } from "../../../../lib/risk-job";
import { getToday } from "../../../../lib/today";
export const maxDuration = 60;

export async function POST() {
  const auth = await requireSession("ACCOUNTS");
  if (!auth.ok) return auth.response;
  const summary = await runRiskJob(db, getToday());
  return NextResponse.json({ ok: true, summary });
}