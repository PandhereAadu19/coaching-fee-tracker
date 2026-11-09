import type { PrismaClient } from "@prisma/client";
import { addDays } from "./dates";
import { normaliseLang } from "./i18n";
import { getInstalmentState } from "./instalments";
import {
  planReminders,
  renderReminderMessage,
  resolveReminderAtSendTime,
  type Language,
} from "./reminders";

export interface ReminderCandidate {
  instalmentId: string;
  dueDate: Date;
  amount: number;
  paid: number;
  studentExited: boolean;
  studentName: string;
  parentName: string;
  language: string;
  existing: { scheduledFor: Date }[];
}

export function buildReminderPlan(candidates: ReminderCandidate[], today: Date) {
  const out: { instalmentId: string; scheduledFor: Date; language: Language; message: string }[] = [];
  for (const c of candidates) {
    const planned = planReminders(
      { dueDate: c.dueDate, amount: c.amount, paid: c.paid, studentExited: c.studentExited },
      today,
      c.existing
    );
    const language = normaliseLang(c.language);
    for (const p of planned) {
      out.push({
        instalmentId: c.instalmentId,
        scheduledFor: p.scheduledFor,
        language,
        message: renderReminderMessage({
          language,
          parentName: c.parentName,
          studentName: c.studentName,
          amountPaise: Math.max(0, c.amount - c.paid),
          dueDate: c.dueDate,
          kind: p.kind,
        }),
      });
    }
  }
  return out;
}

export async function runReminderJob(db: PrismaClient, today: Date) {
  const instalments = await db.instalment.findMany({
    where: { dueDate: { lte: addDays(today, 3) }, plan: { student: { status: "ACTIVE" } } },
    include: {
      payments: { where: { status: "SUCCESS" }, select: { amount: true } },
      reminders: { select: { scheduledFor: true } },
      plan: { include: { student: { include: { parent: true } } } },
    },
  });

  const candidates: ReminderCandidate[] = instalments.map((i) => ({
    instalmentId: i.id,
    dueDate: i.dueDate,
    amount: i.amount,
    paid: i.payments.reduce((s, p) => s + p.amount, 0),
    studentExited: i.plan.student.status === "EXITED",
    studentName: i.plan.student.name,
    parentName: i.plan.student.parent.name,
    language: i.plan.student.parent.language,
    existing: i.reminders,
  }));

  const plan = buildReminderPlan(candidates, today);
  let sent = 0;
  let cancelled = 0;

  for (const p of plan) {
    const reminder = await db.reminder.create({
      data: {
        instalmentId: p.instalmentId,
        scheduledFor: p.scheduledFor,
        language: p.language,
        message: p.message,
        status: "PENDING",
      },
    });

    // Send-time re-check: this is the "stops the moment someone pays" rule.
    const fresh = await db.instalment.findUnique({
      where: { id: p.instalmentId },
      include: {
        payments: { where: { status: "SUCCESS" }, select: { amount: true } },
        plan: { include: { student: { select: { status: true } } } },
      },
    });
    const paid = fresh ? fresh.payments.reduce((s, x) => s + x.amount, 0) : 0;
    const state = fresh
      ? getInstalmentState({ amount: fresh.amount, paid, dueDate: fresh.dueDate, today })
      : { status: "paid" as const };
    const verdict = resolveReminderAtSendTime({
      instalmentStatus: state.status,
      studentExited: fresh?.plan.student.status === "EXITED",
    });

    await db.reminder.update({ where: { id: reminder.id }, data: { status: verdict } });
    if (verdict === "SENT") sent += 1;
    else cancelled += 1;
  }

  return { created: plan.length, sent, cancelled };
}