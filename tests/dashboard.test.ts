import { describe, it, expect } from "vitest";
import {
  buildStudentRow,
  filterRows,
  paginate,
  parseBucket,
  sortRows,
  summarise,
  type StudentInput,
} from "../lib/dashboard";
import { maskPhone } from "../lib/mask";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const TODAY = d("2026-11-02");
const ok = (amount: number) => [{ amount, status: "SUCCESS" }];

function student(id: string, centre: string, batch: string, instalments: StudentInput["instalments"]): StudentInput {
  return {
    id,
    code: `STU-${id}`,
    name: `Student ${id}`,
    batch: { id: batch, name: batch, centre: { id: centre, name: centre } },
    parent: { phone: "9000000003" },
    openFlag: false,
    instalments,
  };
}

const ishita = student("587", "c1", "b1", [
  { amount: 3_000_000, dueDate: d("2026-04-10"), payments: ok(3_000_000) },
  { amount: 3_000_000, dueDate: d("2026-10-10"), payments: ok(1_500_000) },
  { amount: 3_000_000, dueDate: d("2027-01-10"), payments: [] },
]);
const aarav = student("412", "c1", "b2", [
  { amount: 3_000_000, dueDate: d("2026-10-10"), payments: ok(3_000_000) },
]);
const old = student("900", "c2", "b3", [
  { amount: 2_000_000, dueDate: d("2026-07-01"), payments: [] },
]);

const rows = [ishita, aarav, old].map((s) => buildStudentRow(s, TODAY));

describe("buildStudentRow", () => {
  it("computes Ishita's balance, overdue amount and days", () => {
    const r = rows[0];
    expect(r.balance).toBe(4_500_000);
    expect(r.overdueBalance).toBe(1_500_000);
    expect(r.maxDaysOverdue).toBe(23);
    expect(r.bucket).toBe("1-30");
    expect(r.bucketAmounts["notDue"]).toBe(3_000_000);
    expect(r.bucketAmounts["1-30"]).toBe(1_500_000);
  });

  it("a fully paid student has zero everywhere", () => {
    expect(rows[1].balance).toBe(0);
    expect(rows[1].maxDaysOverdue).toBe(0);
  });

  it("a 60+ day student lands in the 60+ bucket", () => {
    expect(rows[2].maxDaysOverdue).toBe(124);
    expect(rows[2].bucket).toBe("60+");
  });
});

describe("summarise", () => {
  it("adds totals and buckets", () => {
    const s = summarise(rows);
    expect(s.totalOutstanding).toBe(4_500_000 + 2_000_000);
    expect(s.totalOverdue).toBe(1_500_000 + 2_000_000);
    expect(s.studentsOverdue).toBe(2);
    expect(s.buckets["60+"]).toBe(2_000_000);
    expect(s.buckets["1-30"]).toBe(1_500_000);
    expect(s.buckets["notDue"]).toBe(3_000_000);
  });
});

describe("filterRows", () => {
  it("filters by centre", () => {
    expect(filterRows(rows, { centreId: "c2" }).map((r) => r.id)).toEqual(["900"]);
  });

  it("filters by batch", () => {
    expect(filterRows(rows, { batchId: "b1" }).map((r) => r.id)).toEqual(["587"]);
  });

  it("filters by ageing bucket", () => {
    expect(filterRows(rows, { bucket: "60+" }).map((r) => r.id)).toEqual(["900"]);
    expect(filterRows(rows, { bucket: "notDue" }).map((r) => r.id)).toEqual(["412"]);
  });

  it("returns nothing when filters match nothing", () => {
    expect(filterRows(rows, { centreId: "c2", batchId: "b1" })).toEqual([]);
  });
});

describe("sortRows and paginate", () => {
  it("sorts by days overdue descending and ascending", () => {
    expect(sortRows(rows, "days", "desc").map((r) => r.id)).toEqual(["900", "587", "412"]);
    expect(sortRows(rows, "days", "asc").map((r) => r.id)).toEqual(["412", "587", "900"]);
  });

  it("sorts by balance", () => {
    expect(sortRows(rows, "balance", "desc")[0].id).toBe("587");
  });

  it("does not change the input array", () => {
    const copy = [...rows];
    sortRows(rows, "balance", "asc");
    expect(rows).toEqual(copy);
  });

  it("paginates and clamps the page number", () => {
    const many = Array.from({ length: 60 }, (_, i) => i);
    expect(paginate(many, 1, 25).items).toHaveLength(25);
    expect(paginate(many, 3, 25).items).toHaveLength(10);
    expect(paginate(many, 99, 25).page).toBe(3);
    expect(paginate(many, -4, 25).page).toBe(1);
    expect(paginate([], 1, 25).pages).toBe(1);
  });
});

describe("helpers", () => {
  it("parseBucket only accepts known values", () => {
    expect(parseBucket("31-60")).toBe("31-60");
    expect(parseBucket("nope")).toBeUndefined();
    expect(parseBucket(undefined)).toBeUndefined();
  });

  it("maskPhone shows only the last four digits", () => {
    expect(maskPhone("9000000003")).toBe("••••••0003");
    expect(maskPhone("123")).toBe("••••");
  });
});