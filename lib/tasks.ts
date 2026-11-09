import type { PrismaClient } from "@prisma/client";

export type TaskAction = "done" | "false_flag";

export function decideTaskAction(task: { status: "OPEN" | "DONE" }): "ok" | "already_closed" {
  return task.status === "DONE" ? "already_closed" : "ok";
}

export async function actOnTask(
  db: PrismaClient,
  args: { taskId: string; action: TaskAction; note?: string }
): Promise<"ok" | "not_found" | "already_closed"> {
  const task = await db.counsellorTask.findUnique({ where: { id: args.taskId } });
  if (!task) return "not_found";
  if (decideTaskAction(task) === "already_closed") return "already_closed";

  await db.$transaction([
    db.counsellorTask.update({
      where: { id: task.id },
      data: { status: "DONE", note: args.note?.trim() || null },
    }),
    db.riskFlag.update({
      where: { id: task.flagId },
      data: { status: args.action === "false_flag" ? "FALSE_FLAG" : "ACTIONED" },
    }),
  ]);
  return "ok";
}