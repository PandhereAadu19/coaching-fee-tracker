import { getInstalmentState, type InstalmentInput } from "./instalments";

export const THRESHOLD = 60;
export const RE_RAISE_MARGIN = 15;

export const WEIGHTS = { instalments: 0.4, attendance: 0.3, tests: 0.3 } as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
function avg(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export interface RiskReason {
  key: "overdue_instalments" | "max_days_overdue" | "attendance_drop" | "test_drop_percent";
  value: number;
}

/**
 * attendanceByMonth: percentages, oldest first.
 * testScores: scores, oldest first (scale does not matter, only the % drop).
 */
export function computeRisk(args: {
  instalments: InstalmentInput[];
  attendanceByMonth: number[];
  testScores: number[];
  today: Date;
}) {
  const { instalments, attendanceByMonth, testScores, today } = args;

  let overdueCount = 0;
  let maxDaysOverdue = 0;
  for (const i of instalments) {
    const s = getInstalmentState({ ...i, today });
    if (s.status === "overdue") {
      overdueCount += 1;
      maxDaysOverdue = Math.max(maxDaysOverdue, s.daysOverdue);
    }
  }
  const instalmentSignal = Math.min(100, 50 * overdueCount + (maxDaysOverdue > 30 ? 25 : 0));

  let attendanceDrop = 0;
  if (attendanceByMonth.length >= 2) {
    const latest = attendanceByMonth[attendanceByMonth.length - 1];
    const earlier = avg(attendanceByMonth.slice(0, -1));
    attendanceDrop = earlier - latest;
  }
  const attendanceSignal = clamp(attendanceDrop * 4, 0, 100);

  let testDropPercent = 0;
  if (testScores.length >= 2) {
    const k = Math.min(2, Math.floor(testScores.length / 2));
    const first = avg(testScores.slice(0, k));
    const last = avg(testScores.slice(-k));
    testDropPercent = first > 0 ? ((first - last) / first) * 100 : 0;
  }
  const testSignal = clamp(testDropPercent * 3, 0, 100);

  const score = Math.round(
    WEIGHTS.instalments * instalmentSignal +
      WEIGHTS.attendance * attendanceSignal +
      WEIGHTS.tests * testSignal
  );

  const reasons: RiskReason[] = [];
  if (overdueCount > 0) {
    reasons.push({ key: "overdue_instalments", value: overdueCount });
    reasons.push({ key: "max_days_overdue", value: maxDaysOverdue });
  }
  if (attendanceDrop > 0) reasons.push({ key: "attendance_drop", value: Math.round(attendanceDrop) });
  if (testDropPercent > 0) reasons.push({ key: "test_drop_percent", value: Math.round(testDropPercent) });

  return { score, reasons };
}

export function shouldCreateFlag(args: {
  score: number;
  previousFlag?: { score: number; status: "OPEN" | "FALSE_FLAG" | "ACTIONED" } | null;
  hasNewOverdue: boolean;
}): boolean {
  const { score, previousFlag, hasNewOverdue } = args;
  if (score < THRESHOLD) return false;
  if (!previousFlag) return true;
  if (previousFlag.status === "OPEN") return false; // already flagged, don't duplicate
  // false flag or already actioned: only re-raise on new evidence
  return score >= previousFlag.score + RE_RAISE_MARGIN || hasNewOverdue;
}