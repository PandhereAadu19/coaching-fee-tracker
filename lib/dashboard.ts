import { ageingBucket, getInstalmentState, type AgeingBucket } from "./instalments";

export const BUCKETS: AgeingBucket[] = ["notDue", "1-30", "31-60", "60+"];

export interface StudentInput {
  id: string;
  code: string;
  name: string;
  batch: { id: string; name: string; centre: { id: string; name: string } };
  parent: { phone: string };
  openFlag: boolean;
  instalments: {
    amount: number;
    dueDate: Date;
    payments: { amount: number; status: string }[];
  }[];
}

export interface StudentRow {
  id: string;
  code: string;
  name: string;
  centreId: string;
  centreName: string;
  batchId: string;
  batchName: string;
  phone: string;
  hasOpenFlag: boolean;
  balance: number;
  overdueBalance: number;
  maxDaysOverdue: number;
  bucket: AgeingBucket;
  bucketAmounts: Record<AgeingBucket, number>;
}

const emptyBuckets = (): Record<AgeingBucket, number> => ({ notDue: 0, "1-30": 0, "31-60": 0, "60+": 0 });

export function buildStudentRow(s: StudentInput, today: Date): StudentRow {
  const bucketAmounts = emptyBuckets();
  let balance = 0;
  let overdueBalance = 0;
  let maxDaysOverdue = 0;

  for (const i of s.instalments) {
    const paid = i.payments.filter((p) => p.status === "SUCCESS").reduce((a, p) => a + p.amount, 0);
    const st = getInstalmentState({ amount: i.amount, paid, dueDate: i.dueDate, today });
    if (st.status === "paid") continue;
    balance += st.balance;
    bucketAmounts[ageingBucket(st.daysOverdue)] += st.balance;
    if (st.status === "overdue") {
      overdueBalance += st.balance;
      maxDaysOverdue = Math.max(maxDaysOverdue, st.daysOverdue);
    }
  }

  return {
    id: s.id,
    code: s.code,
    name: s.name,
    centreId: s.batch.centre.id,
    centreName: s.batch.centre.name,
    batchId: s.batch.id,
    batchName: s.batch.name,
    phone: s.parent.phone,
    hasOpenFlag: s.openFlag,
    balance,
    overdueBalance,
    maxDaysOverdue,
    bucket: ageingBucket(maxDaysOverdue),
    bucketAmounts,
  };
}

export function summarise(rows: StudentRow[]) {
  const buckets = emptyBuckets();
  let totalOutstanding = 0;
  let totalOverdue = 0;
  let studentsOverdue = 0;
  for (const r of rows) {
    totalOutstanding += r.balance;
    totalOverdue += r.overdueBalance;
    if (r.overdueBalance > 0) studentsOverdue += 1;
    for (const b of BUCKETS) buckets[b] += r.bucketAmounts[b];
  }
  return { totalOutstanding, totalOverdue, studentsOverdue, buckets };
}

export function filterRows(
  rows: StudentRow[],
  f: { centreId?: string; batchId?: string; bucket?: AgeingBucket }
) {
  return rows.filter((r) => {
    if (f.centreId && r.centreId !== f.centreId) return false;
    if (f.batchId && r.batchId !== f.batchId) return false;
    if (f.bucket) {
      if (f.bucket === "notDue") return r.maxDaysOverdue === 0;
      return r.bucket === f.bucket;
    }
    return true;
  });
}

export function sortRows(rows: StudentRow[], key: "days" | "balance", dir: "asc" | "desc") {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const diff = key === "days" ? a.maxDaysOverdue - b.maxDaysOverdue : a.balance - b.balance;
    return diff !== 0 ? diff * sign : a.name.localeCompare(b.name);
  });
}

export function paginate<T>(items: T[], page: number, size = 25) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: items.slice((current - 1) * size, current * size), total: items.length, pages, page: current };
}

export function parseBucket(v: string | undefined): AgeingBucket | undefined {
  return BUCKETS.find((b) => b === v);
}