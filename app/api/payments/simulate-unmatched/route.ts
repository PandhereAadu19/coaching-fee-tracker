import { NextResponse } from "next/server";
import { requireSession } from "../../../../lib/auth";
import { simulateUnmatched } from "../../../../lib/assign";
import { db } from "../../../../lib/db";
import { getToday } from "../../../../lib/today";

export async function POST() {
  const auth = await requireSession("ACCOUNTS");
  if (!auth.ok) return auth.response;
  await simulateUnmatched(db, getToday());
  return NextResponse.json({ ok: true, summary: {} });
}