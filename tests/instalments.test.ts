import { describe, it, expect } from "vitest";
import {
  ageingBucket,
  daysBetween,
  getInstalmentState,
  summariseStudent,
} from "../lib/instalments";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const TODAY = d("2026-11-02");

describe("getInstalmentState", () => {
  it("is not overdue on the exact due date", () => {
    const r = getInstalmentState({ amount: 3000000, paid: 0, dueDate: TODAY, today: TODAY });
    expect(r.status).toBe("due");
    expect(r.daysOverdue).toBe(0);
  });

  it("is overdue one day after the due date", () => {
    const r = getInstalmentState({ amount: 3000000, paid: 0, dueDate: d("2026-11-01"), today: TODAY });
    expect(r.status).toBe("overdue");
    expect(r.daysOverdue).toBe(1);
  });

  it("part payment that is overdue keeps overdue status and partPaid flag", () => {
    const r = getInstalmentState({ amount: 3000000, paid: 1000000, dueDate: d("2026-10-10"), today: TODAY });
    expect(r.status).toBe("overdue");
    expect(r.partPaid).toBe(true);
    expect(r.balance).toBe(2000000);
  });

  it("part payment before the due date is part_paid", () => {
    const r = getInstalmentState({ amount: 3000000, paid: 500000, dueDate: d("2026-12-01"), today: TODAY });
    expect(r.status).toBe("part_paid");
  });

  it("overpayment counts as paid with zero balance", () => {
    const r = getInstalmentState({ amount: 3000000, paid: 3500000, dueDate: d("2026-10-10"), today: TODAY });
    expect(r.status).toBe("paid");
    expect(r.balance).toBe(0);
  });

  it("due within 7 days is due, 8 days is upcoming", () => {
    expect(getInstalmentState({ amount: 100, paid: 0, dueDate: d("2026-11-09"), today: TODAY }).status).toBe("due");
    expect(getInstalmentState({ amount: 100, paid: 0, dueDate: d("2026-11-10"), today: TODAY }).status).toBe("upcoming");
  });

  describe("sample rows from the brief (today = 2026-11-02)", () => {
    it("Aarav Meena is paid", () => {
      const r = getInstalmentState({ amount: 3000000, paid: 3000000, dueDate: d("2026-10-10"), today: TODAY });
      expect(r.status).toBe("paid");
    });

    it("Ishita Sharma is part paid and 23 days overdue", () => {
      const r = getInstalmentState({ amount: 3000000, paid: 1500000, dueDate: d("2026-10-10"), today: TODAY });
      expect(r.status).toBe("overdue");
      expect(r.partPaid).toBe(true);
      expect(r.daysOverdue).toBe(23);
      expect(r.balance).toBe(1500000);
    });

    it("Mohit Gurjar is due in 13 days so upcoming", () => {
      const dueDate = d("2026-11-15");
      expect(daysBetween(TODAY, dueDate)).toBe(13);
      const r = getInstalmentState({ amount: 4000000, paid: 0, dueDate, today: TODAY });
      expect(r.status).toBe("upcoming");
    });
  });
});

describe("ageingBucket", () => {
  it("handles every boundary", () => {
    expect(ageingBucket(0)).toBe("notDue");
    expect(ageingBucket(-5)).toBe("notDue");
    expect(ageingBucket(1)).toBe("1-30");
    expect(ageingBucket(30)).toBe("1-30");
    expect(ageingBucket(31)).toBe("31-60");
    expect(ageingBucket(60)).toBe("31-60");
    expect(ageingBucket(61)).toBe("60+");
  });
});

describe("summariseStudent", () => {
  it("adds up Ishita's instalments", () => {
    const r = summariseStudent(
      [
        { amount: 3000000, paid: 3000000, dueDate: d("2026-04-10") },
        { amount: 3000000, paid: 1500000, dueDate: d("2026-10-10") },
        { amount: 3000000, paid: 0, dueDate: d("2027-01-10") },
      ],
      TODAY
    );
    expect(r.totalPaid).toBe(4500000);
    expect(r.balance).toBe(4500000);
    expect(r.overdueBalance).toBe(1500000);
    expect(r.maxDaysOverdue).toBe(23);
    expect(r.totalDue).toBe(6000000);
  });
});