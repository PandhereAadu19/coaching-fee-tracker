import { getInstalmentState, type InstalmentStatus } from "./instalments";

export interface DueRow {
  id: string;
  seq: number;
  dueDate: Date;
  amount: number;
  paid: number;
  balance: number;
  status: InstalmentStatus;
  daysOverdue: number;
  partPaid: boolean;
}

export function buildDueRows(
  instalments: {
    id: string;
    seq: number;
    dueDate: Date;
    amount: number;
    payments: { amount: number; status: string }[];
  }[],
  today: Date
): DueRow[] {
  return [...instalments]
    .sort((a, b) => a.seq - b.seq)
    .map((i) => {
      const paid = i.payments
        .filter((p) => p.status === "SUCCESS")
        .reduce((sum, p) => sum + p.amount, 0);
      const state = getInstalmentState({ amount: i.amount, paid, dueDate: i.dueDate, today });
      return { id: i.id, seq: i.seq, dueDate: i.dueDate, amount: i.amount, paid, ...state };
    });
}

/** The earliest instalment that is not fully paid. */
export function pickNext(rows: DueRow[]): DueRow | null {
  return rows.find((r) => r.status !== "paid") ?? null;
}