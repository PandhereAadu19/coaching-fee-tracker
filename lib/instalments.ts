export type InstalmentStatus =
  | "paid"
  | "overdue"
  | "part_paid"
  | "due"
  | "upcoming";

export type AgeingBucket = "notDue" | "1-30" | "31-60" | "60+";

const DAY_MS = 86_400_000;

function utcDay(d: Date): number {
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY_MS
  );
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: Date, to: Date): number {
  return utcDay(to) - utcDay(from);
}

export interface InstalmentInput {
  amount: number; // paise
  paid: number; // paise
  dueDate: Date;
}

export function getInstalmentState(args: InstalmentInput & { today: Date }) {
  const { amount, paid, dueDate, today } = args;
  const balance = Math.max(0, amount - paid);
  const partPaid = paid > 0 && paid < amount;

  if (paid >= amount) {
    return { status: "paid" as InstalmentStatus, balance: 0, daysOverdue: 0, partPaid: false };
  }

  const daysUntilDue = daysBetween(today, dueDate);

  if (daysUntilDue < 0) {
    return { status: "overdue" as InstalmentStatus, balance, daysOverdue: -daysUntilDue, partPaid };
  }
  if (paid > 0) {
    return { status: "part_paid" as InstalmentStatus, balance, daysOverdue: 0, partPaid };
  }
  if (daysUntilDue <= 7) {
    return { status: "due" as InstalmentStatus, balance, daysOverdue: 0, partPaid };
  }
  return { status: "upcoming" as InstalmentStatus, balance, daysOverdue: 0, partPaid };
}

export function ageingBucket(daysOverdue: number): AgeingBucket {
  if (daysOverdue <= 0) return "notDue";
  if (daysOverdue <= 30) return "1-30";
  if (daysOverdue <= 60) return "31-60";
  return "60+";
}

/**
 * totalDue = amount of instalments whose due date is today or earlier
 * balance = everything still unpaid, overdueBalance = unpaid on overdue instalments
 */
export function summariseStudent(instalments: InstalmentInput[], today: Date) {
  let totalDue = 0;
  let totalPaid = 0;
  let balance = 0;
  let overdueBalance = 0;
  let maxDaysOverdue = 0;

  for (const i of instalments) {
    const state = getInstalmentState({ ...i, today });
    totalPaid += Math.min(i.paid, i.amount);
    balance += state.balance;
    if (daysBetween(today, i.dueDate) <= 0) totalDue += i.amount;
    if (state.status === "overdue") {
      overdueBalance += state.balance;
      maxDaysOverdue = Math.max(maxDaysOverdue, state.daysOverdue);
    }
  }

  return { totalDue, totalPaid, balance, overdueBalance, maxDaysOverdue };
}