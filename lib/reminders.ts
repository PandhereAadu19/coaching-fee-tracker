import { addDays } from "./dates";
import { daysBetween, type InstalmentStatus } from "./instalments";
import { formatINR } from "./money";

export const REMINDER_OFFSETS = [-3, 0, 3, 7, 14] as const;
export type ReminderKind = "before" | "on" | "after";
export type Language = "en" | "hi";

export function kindForOffset(offset: number): ReminderKind {
  if (offset < 0) return "before";
  if (offset === 0) return "on";
  return "after";
}

export interface PlannedReminder {
  scheduledFor: Date;
  offsetDays: number;
  kind: ReminderKind;
}

/**
 * Plans at most ONE reminder per run: the latest scheduled date that has arrived
 * and is not already covered by an existing reminder. This avoids floods of
 * old reminders for instalments that are already overdue, and avoids duplicates
 * when the job runs twice.
 */
export function planReminders(
  instalment: { dueDate: Date; amount: number; paid: number; studentExited?: boolean },
  today: Date,
  existing: { scheduledFor: Date }[]
): PlannedReminder[] {
  if (instalment.studentExited) return [];
  if (instalment.paid >= instalment.amount) return [];

  const arrived = REMINDER_OFFSETS.map((offset) => ({
    offsetDays: offset as number,
    scheduledFor: addDays(instalment.dueDate, offset),
  })).filter((c) => daysBetween(c.scheduledFor, today) >= 0);

  if (arrived.length === 0) return [];

  const latest = arrived[arrived.length - 1];
  const covered = existing.some((e) => daysBetween(latest.scheduledFor, e.scheduledFor) >= 0);
  if (covered) return [];

  return [{ ...latest, kind: kindForOffset(latest.offsetDays) }];
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function renderReminderMessage(args: {
  language: Language;
  parentName: string;
  studentName: string;
  amountPaise: number;
  dueDate: Date;
  kind: ReminderKind;
}): string {
  const { language, parentName, studentName, amountPaise, dueDate, kind } = args;
  const amt = formatINR(amountPaise);
  const date = formatDate(dueDate);

  if (language === "hi") {
    const hi = {
      before: `प्रिय ${parentName}, ${studentName} की ${amt} फीस ${date} को देय है। कृपया पैरेंट ऐप में भुगतान करें।`,
      on: `प्रिय ${parentName}, ${studentName} की ${amt} फीस आज (${date}) देय है। कृपया पैरेंट ऐप में भुगतान करें।`,
      after: `प्रिय ${parentName}, ${studentName} की ${amt} फीस ${date} को देय थी और अभी बकाया है। कृपया पैरेंट ऐप में भुगतान करें।`,
    };
    return hi[kind];
  }

  const en = {
    before: `Dear ${parentName}, a reminder that ${studentName}'s fee of ${amt} is due on ${date}. You can pay in the parent app.`,
    on: `Dear ${parentName}, ${studentName}'s fee of ${amt} is due today (${date}). You can pay in the parent app.`,
    after: `Dear ${parentName}, ${studentName}'s fee of ${amt} was due on ${date} and is still unpaid. Please pay in the parent app.`,
  };
  return en[kind];
}

/** Re-check at send time: this is what makes reminders stop the moment someone pays. */
export function resolveReminderAtSendTime(args: {
  instalmentStatus: InstalmentStatus;
  studentExited: boolean;
}): "SENT" | "CANCELLED" {
  if (args.studentExited) return "CANCELLED";
  if (args.instalmentStatus === "paid") return "CANCELLED";
  return "SENT";
}