import { describe, it, expect } from "vitest";
import { buildReminderPlan, type ReminderCandidate } from "../lib/reminder-job";
import { decideAssign } from "../lib/assign";
import { decideTaskAction } from "../lib/tasks";
import { safeEqual } from "../lib/secure";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const TODAY = d("2026-11-02");

const base: ReminderCandidate = {
  instalmentId: "i1",
  dueDate: d("2026-11-05"),
  amount: 3_000_000,
  paid: 0,
  studentExited: false,
  studentName: "Aarav",
  parentName: "Meena",
  language: "en",
  existing: [],
};

describe("buildReminderPlan", () => {
  it("creates the 3-days-before reminder for an unpaid instalment", () => {
    const plan = buildReminderPlan([base], TODAY);
    expect(plan).toHaveLength(1);
    expect(plan[0].scheduledFor.toISOString().slice(0, 10)).toBe("2026-11-02");
    expect(plan[0].message).toContain("₹30,000");
  });

  it("creates nothing when the instalment is paid", () => {
    expect(buildReminderPlan([{ ...base, paid: 3_000_000 }], TODAY)).toEqual([]);
  });

  it("creates nothing for an exited student", () => {
    expect(buildReminderPlan([{ ...base, studentExited: true }], TODAY)).toEqual([]);
  });

  it("creates no duplicate when the reminder already exists", () => {
    const first = buildReminderPlan([base], TODAY);
    const again = buildReminderPlan([{ ...base, existing: [{ scheduledFor: first[0].scheduledFor }] }], TODAY);
    expect(again).toEqual([]);
  });

  it("writes Hindi for Hindi-speaking parents and falls back to English otherwise", () => {
    const hi = buildReminderPlan([{ ...base, language: "hi" }], TODAY)[0];
    expect(hi.language).toBe("hi");
    expect(hi.message).toMatch(/[\u0900-\u097F]/);
    expect(buildReminderPlan([{ ...base, language: "xx" }], TODAY)[0].language).toBe("en");
  });

  it("uses the remaining balance for part-paid instalments", () => {
    const plan = buildReminderPlan([{ ...base, paid: 1_000_000 }], TODAY);
    expect(plan[0].message).toContain("₹20,000");
  });
});

describe("decideAssign", () => {
  it("accepts an unassigned payment that fits the balance", () => {
    expect(decideAssign({ payment: { instalmentId: null, amount: 500_000 }, balance: 1_500_000 })).toBe("ok");
  });

  it("accepts a payment equal to the balance", () => {
    expect(decideAssign({ payment: { instalmentId: null, amount: 1_500_000 }, balance: 1_500_000 })).toBe("ok");
  });

  it("rejects a payment that is already assigned", () => {
    expect(decideAssign({ payment: { instalmentId: "x", amount: 100 }, balance: 1000 })).toBe("already_assigned");
  });

  it("rejects an instalment that is already paid", () => {
    expect(decideAssign({ payment: { instalmentId: null, amount: 100 }, balance: 0 })).toBe("already_paid");
  });

  it("rejects a payment larger than the balance", () => {
    expect(decideAssign({ payment: { instalmentId: null, amount: 2_000_000 }, balance: 1_500_000 })).toBe(
      "exceeds_balance"
    );
  });
});

describe("decideTaskAction", () => {
  it("lets an open task be closed and blocks a closed one", () => {
    expect(decideTaskAction({ status: "OPEN" })).toBe("ok");
    expect(decideTaskAction({ status: "DONE" })).toBe("already_closed");
  });
});

describe("safeEqual", () => {
  it("compares secrets safely", () => {
    expect(safeEqual("Bearer abc", "Bearer abc")).toBe(true);
    expect(safeEqual("Bearer abc", "Bearer abd")).toBe(false);
    expect(safeEqual("short", "a much longer value")).toBe(false);
  });
});