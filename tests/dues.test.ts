import { describe, it, expect } from "vitest";
import { buildDueRows, pickNext } from "../lib/dues";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const TODAY = d("2026-11-02");

const ishita = [
  { id: "a", seq: 2, dueDate: d("2026-10-10"), amount: 3_000_000, payments: [{ amount: 1_500_000, status: "SUCCESS" }] },
  { id: "b", seq: 1, dueDate: d("2026-04-10"), amount: 3_000_000, payments: [{ amount: 3_000_000, status: "SUCCESS" }] },
  { id: "c", seq: 3, dueDate: d("2027-01-10"), amount: 3_000_000, payments: [] },
];

describe("buildDueRows", () => {
  it("sorts by sequence and derives status", () => {
    const rows = buildDueRows(ishita, TODAY);
    expect(rows.map((r) => r.seq)).toEqual([1, 2, 3]);
    expect(rows[0].status).toBe("paid");
    expect(rows[1].status).toBe("overdue");
    expect(rows[1].daysOverdue).toBe(23);
    expect(rows[1].balance).toBe(1_500_000);
    expect(rows[2].status).toBe("upcoming");
  });

  it("ignores payments that are not successful", () => {
    const rows = buildDueRows(
      [{ id: "x", seq: 1, dueDate: d("2026-10-10"), amount: 1000, payments: [{ amount: 1000, status: "FAILED" }] }],
      TODAY
    );
    expect(rows[0].paid).toBe(0);
    expect(rows[0].status).toBe("overdue");
  });

  it("does not change the input order", () => {
    const copy = [...ishita];
    buildDueRows(ishita, TODAY);
    expect(ishita.map((i) => i.id)).toEqual(copy.map((i) => i.id));
  });
});

describe("pickNext", () => {
  it("returns the earliest unpaid instalment (the overdue one)", () => {
    expect(pickNext(buildDueRows(ishita, TODAY))?.id).toBe("a");
  });

  it("returns null when everything is paid", () => {
    const allPaid = ishita.map((i) => ({ ...i, payments: [{ amount: i.amount, status: "SUCCESS" }] }));
    expect(pickNext(buildDueRows(allPaid, TODAY))).toBeNull();
  });
});