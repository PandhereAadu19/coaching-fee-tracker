import { afterEach, describe, expect, it } from "vitest";
import { getToday } from "@/lib/today";

describe("getToday", () => {
  const original = process.env.DEMO_TODAY;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DEMO_TODAY;
    } else {
      process.env.DEMO_TODAY = original;
    }
  });

  it("returns the DEMO_TODAY calendar date when set", () => {
    process.env.DEMO_TODAY = "2026-11-02";
    const today = getToday();
    expect(today.getFullYear()).toBe(2026);
    expect(today.getMonth()).toBe(10);
    expect(today.getDate()).toBe(2);
  });
});
