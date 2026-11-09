import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "../../../../../lib/auth";
import { db } from "../../../../../lib/db";
import { actOnTask } from "../../../../../lib/tasks";

const schema = z.object({
  action: z.enum(["done", "false_flag"]),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSession("ACCOUNTS");
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { id } = await ctx.params;
  const result = await actOnTask(db, { taskId: id, ...parsed.data });
  if (result === "not_found") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "already_closed") return NextResponse.json({ error: "Task already closed" }, { status: 409 });
  return NextResponse.json({ ok: true });
}