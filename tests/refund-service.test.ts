import { describe, it, expect } from "vitest";
import { computeForStudent, parseExitDate, refundEligibility } from "../lib/refund-service";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

const student = {
  batch: { startDate: d("2026-04-01"), endDate: d("2026-07-10") },
  feePlan: {
    totalFee: 8_000_000,
    discount: 0,
    instalments: [
      { payments: [{ amount: 4_000_000, status: "SUCCESS" }] },
      { payments: [{ amount: 4_000_000, status: "FAILED" }] },
    ],
  },
};

describe("parseExitDate", () => {
  it("accepts a real date", () => {
    expect(parseExitDate("2026-11-02")?.toISOString()).toBe("2026-11-02T00:00:00.000Z");
  });

  it("rejects wrong formats and impossible dates", () => {
    expect(parseExitDate("02-11-2026")).toBeNull();
    expect(parseExitDate("2026-02-30")).toBeNull();
    expect(parseExitDate("")).toBeNull();
    expect(parseExitDate("2026-13-01")).toBeNull();
  });
});

describe("refundEligibility", () => {
  it("allows an active student with a plan and no refund", () => {
    expect(refundEligibility({ status: "ACTIVE", refundCount: 0, hasPlan: true })).toBe("ok");
  });

  it("blocks students without a plan, already exited or already refunded", () => {
    expect(refundEligibility({ status: "ACTIVE", refundCount: 0, hasPlan: false })).toBe("no_plan");
    expect(refundEligibility({ status: "EXITED", refundCount: 0, hasPlan: true })).toBe("already_exited");
    expect(refundEligibility({ status: "ACTIVE", refundCount: 1, hasPlan: true })).toBe("already_refunded");
  });
});

describe("computeForStudent", () => {
  it("counts only successful payments as fees paid", () => {
    const r = computeForStudent(student, d("2026-04-04"), d("2026-11-02"));
    expect(r.steps[0].amount).toBe(4_000_000);
    expect(r.adminFee).toBe(400_000);
    expect(r.refund).toBe(3_600_000);
  });

  it("applies the discount to the net fee", () => {
    const r = computeForStudent(
      { ...student, feePlan: { ...student.feePlan, discount: 2_000_000 } },
      d("2026-05-21"),
      d("2026-11-02")
    );
    expect(r.adminFee).toBe(300_000);
    expect(r.tuitionDeduction).toBe(3_000_000);
    expect(r.refund).toBe(700_000);
  });
});