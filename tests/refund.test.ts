import { describe, it, expect } from "vitest";
import { calculateRefund } from "../lib/refund";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
// 100 day course: 2026-04-01 to 2026-07-10
const base = {
  netFee: 8_000_000, // ₹80,000
  feesPaid: 8_000_000,
  courseStart: d("2026-04-01"),
  courseEnd: d("2026-07-10"),
  requestDate: d("2026-11-02"),
};

describe("calculateRefund", () => {
  it("exit on day 3 deducts only the admin fee", () => {
    const r = calculateRefund({ ...base, feesPaid: 4_000_000, exitDate: d("2026-04-04") });
    expect(r.tuitionDeduction).toBe(0);
    expect(r.adminFee).toBe(400_000);
    expect(r.refund).toBe(3_600_000);
  });

  it("day 7 is still free, day 8 starts the pro-rata deduction", () => {
    const day7 = calculateRefund({ ...base, exitDate: d("2026-04-08") });
    const day8 = calculateRefund({ ...base, exitDate: d("2026-04-09") });
    expect(day7.elapsedDays).toBe(7);
    expect(day7.tuitionDeduction).toBe(0);
    expect(day8.elapsedDays).toBe(8);
    expect(day8.tuitionDeduction).toBe(640_000);
  });

  it("mid-course exit is pro-rata by days", () => {
    const r = calculateRefund({ ...base, exitDate: d("2026-05-21") });
    expect(r.elapsedDays).toBe(50);
    expect(r.tuitionDeduction).toBe(4_000_000);
    expect(r.refund).toBe(3_600_000);
  });

  it("exit after the course ended is clamped to the full fee", () => {
    const r = calculateRefund({ ...base, exitDate: d("2026-08-01") });
    expect(r.elapsedDays).toBe(100);
    expect(r.tuitionDeduction).toBe(8_000_000);
    expect(r.refund).toBe(0);
  });

  it("exit before the course starts is treated as day 0", () => {
    const r = calculateRefund({ ...base, exitDate: d("2026-03-01") });
    expect(r.elapsedDays).toBe(0);
    expect(r.tuitionDeduction).toBe(0);
  });

  it("caps the admin fee at ₹5,000 on a large fee", () => {
    const r = calculateRefund({
      ...base,
      netFee: 20_000_000,
      feesPaid: 20_000_000,
      exitDate: d("2026-04-04"),
    });
    expect(r.adminFee).toBe(500_000);
    expect(r.refund).toBe(19_500_000);
  });

  it("floors the refund at zero when little was paid", () => {
    const r = calculateRefund({ ...base, feesPaid: 100_000, exitDate: d("2026-05-21") });
    expect(r.refund).toBe(0);
  });

  it("handles partial payments", () => {
    const r = calculateRefund({ ...base, feesPaid: 6_000_000, exitDate: d("2026-05-21") });
    expect(r.refund).toBe(1_600_000);
  });

  it("payout deadline is exactly 10 days after the request", () => {
    const r = calculateRefund({ ...base, exitDate: d("2026-05-21") });
    expect(r.payBy.toISOString().slice(0, 10)).toBe("2026-11-12");
  });

  it("never produces fractions of a paisa", () => {
    const r = calculateRefund({
      ...base,
      netFee: 9_999_999,
      feesPaid: 9_999_999,
      exitDate: d("2026-05-17"),
    });
    for (const v of [r.refund, r.adminFee, r.tuitionDeduction]) {
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("returns four breakdown steps ending with the refund", () => {
    const r = calculateRefund({ ...base, exitDate: d("2026-05-21") });
    expect(r.steps.map((s) => s.key)).toEqual([
      "fees_paid",
      "tuition_deduction",
      "admin_fee",
      "refund",
    ]);
    expect(r.steps[3].amount).toBe(r.refund);
  });
});