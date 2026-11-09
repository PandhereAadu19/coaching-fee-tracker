import { describe, it, expect } from "vitest";
import {
  planReminders,
  renderReminderMessage,
  resolveReminderAtSendTime,
} from "../lib/reminders";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const day = (x: Date) => x.toISOString().slice(0, 10);
const unpaid = { dueDate: d("2026-11-15"), amount: 3_000_000, paid: 0 };

describe("planReminders", () => {
  it("plans nothing 13 days before the due date", () => {
    expect(planReminders(unpaid, d("2026-11-02"), [])).toEqual([]);
  });

  it("plans the 3-days-before reminder", () => {
    const r = planReminders(unpaid, d("2026-11-12"), []);
    expect(r).toHaveLength(1);
    expect(r[0].kind).toBe("before");
    expect(day(r[0].scheduledFor)).toBe("2026-11-12");
  });

  it("plans the on-due-date reminder", () => {
    const r = planReminders(unpaid, d("2026-11-15"), []);
    expect(r[0].kind).toBe("on");
  });

  it("plans 3, 7 and 14 days after", () => {
    expect(planReminders(unpaid, d("2026-11-18"), [])[0].offsetDays).toBe(3);
    expect(planReminders(unpaid, d("2026-11-22"), [])[0].offsetDays).toBe(7);
    expect(planReminders(unpaid, d("2026-11-29"), [])[0].offsetDays).toBe(14);
  });

  it("sends only the latest reminder for an instalment already overdue", () => {
    const r = planReminders({ ...unpaid, dueDate: d("2026-10-10") }, d("2026-11-02"), []);
    expect(r).toHaveLength(1);
    expect(r[0].offsetDays).toBe(14);
    expect(day(r[0].scheduledFor)).toBe("2026-10-24");
  });

  it("creates no duplicates when the job runs twice", () => {
    const today = d("2026-11-12");
    const first = planReminders(unpaid, today, []);
    const second = planReminders(unpaid, today, first);
    expect(second).toEqual([]);
  });

  it("plans nothing once the instalment is paid", () => {
    expect(planReminders({ ...unpaid, paid: 3_000_000 }, d("2026-11-20"), [])).toEqual([]);
  });

  it("plans nothing for an exited student", () => {
    expect(planReminders({ ...unpaid, studentExited: true }, d("2026-11-20"), [])).toEqual([]);
  });
});

describe("renderReminderMessage", () => {
  const args = {
    parentName: "Meena",
    studentName: "Aarav",
    amountPaise: 3_000_000,
    dueDate: d("2026-10-10"),
    kind: "after" as const,
  };

  it("English message contains the amount and the date", () => {
    const m = renderReminderMessage({ ...args, language: "en" });
    expect(m).toContain("₹30,000");
    expect(m).toContain("10 Oct 2026");
  });

  it("Hindi message is in Devanagari and contains the amount", () => {
    const m = renderReminderMessage({ ...args, language: "hi" });
    expect(m).toMatch(/[\u0900-\u097F]/);
    expect(m).toContain("₹30,000");
  });
});

describe("resolveReminderAtSendTime", () => {
  it("sends when still unpaid", () => {
    expect(resolveReminderAtSendTime({ instalmentStatus: "overdue", studentExited: false })).toBe("SENT");
  });

  it("cancels when paid between planning and sending", () => {
    expect(resolveReminderAtSendTime({ instalmentStatus: "paid", studentExited: false })).toBe("CANCELLED");
  });

  it("cancels for an exited student", () => {
    expect(resolveReminderAtSendTime({ instalmentStatus: "overdue", studentExited: true })).toBe("CANCELLED");
  });
});