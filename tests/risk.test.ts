import { describe, it, expect } from "vitest";
import { computeRisk, shouldCreateFlag, THRESHOLD } from "../lib/risk";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const TODAY = d("2026-11-02");
const paid = [{ amount: 100, paid: 100, dueDate: d("2026-04-10") }];
const overdue2 = [
  { amount: 3_000_000, paid: 0, dueDate: d("2026-09-20") }, // 43 days
  { amount: 3_000_000, paid: 0, dueDate: d("2026-10-10") }, // 23 days
];
const flatAttendance = [90, 90, 90];
const flatTests = [70, 70, 70, 70];

describe("computeRisk", () => {
  it("a healthy student scores 0", () => {
    const r = computeRisk({
      instalments: paid,
      attendanceByMonth: [90, 91, 92],
      testScores: [70, 72, 75, 78],
      today: TODAY,
    });
    expect(r.score).toBe(0);
    expect(r.reasons).toEqual([]);
  });

  it("instalment signal alone is worth 40 points", () => {
    const r = computeRisk({
      instalments: overdue2,
      attendanceByMonth: flatAttendance,
      testScores: flatTests,
      today: TODAY,
    });
    expect(r.score).toBe(40);
  });

  it("attendance signal alone is worth 30 points", () => {
    const r = computeRisk({
      instalments: paid,
      attendanceByMonth: [100, 100, 0],
      testScores: flatTests,
      today: TODAY,
    });
    expect(r.score).toBe(30);
  });

  it("test signal alone is worth 30 points", () => {
    const r = computeRisk({
      instalments: paid,
      attendanceByMonth: flatAttendance,
      testScores: [100, 100, 0, 0],
      today: TODAY,
    });
    expect(r.score).toBe(30);
  });

  it("one overdue instalment of 23 days gives 50 x 0.4 = 20", () => {
    const r = computeRisk({
      instalments: [overdue2[1]],
      attendanceByMonth: flatAttendance,
      testScores: flatTests,
      today: TODAY,
    });
    expect(r.score).toBe(20);
  });

  it("a student failing on all three signals scores 100 and lists reasons", () => {
    const r = computeRisk({
      instalments: overdue2,
      attendanceByMonth: [90, 88, 60],
      testScores: [80, 78, 50, 45],
      today: TODAY,
    });
    expect(r.score).toBe(100);
    const keys = r.reasons.map((x) => x.key);
    expect(keys).toContain("overdue_instalments");
    expect(keys).toContain("attendance_drop");
    expect(keys).toContain("test_drop_percent");
  });

  it("handles missing data without crashing", () => {
    const r = computeRisk({ instalments: [], attendanceByMonth: [], testScores: [], today: TODAY });
    expect(r.score).toBe(0);
  });
});

describe("shouldCreateFlag", () => {
  it("threshold edge: 59 no, 60 yes", () => {
    expect(THRESHOLD).toBe(60);
    expect(shouldCreateFlag({ score: 59, hasNewOverdue: false })).toBe(false);
    expect(shouldCreateFlag({ score: 60, hasNewOverdue: false })).toBe(true);
  });

  it("does not duplicate an already open flag", () => {
    expect(
      shouldCreateFlag({ score: 90, previousFlag: { score: 60, status: "OPEN" }, hasNewOverdue: true })
    ).toBe(false);
  });

  it("a false flag stays suppressed without new evidence", () => {
    expect(
      shouldCreateFlag({ score: 68, previousFlag: { score: 65, status: "FALSE_FLAG" }, hasNewOverdue: false })
    ).toBe(false);
  });

  it("a false flag re-raises at +15 points", () => {
    expect(
      shouldCreateFlag({ score: 80, previousFlag: { score: 65, status: "FALSE_FLAG" }, hasNewOverdue: false })
    ).toBe(true);
  });

  it("a false flag re-raises on a new overdue instalment", () => {
    expect(
      shouldCreateFlag({ score: 62, previousFlag: { score: 65, status: "FALSE_FLAG" }, hasNewOverdue: true })
    ).toBe(true);
  });
});