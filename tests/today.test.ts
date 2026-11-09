import { afterEach, describe, expect, it } from "vitest";
import { getToday } from "../lib/today";

describe("getToday", () => {
  const original = process.env.DEMO_TODAY;

  afterEach(() => {
    if (original === undefined) delete process.env.DEMO_TODAY;
    else process.env.DEMO_TODAY = original;
  });

  it("returns DEMO_TODAY as UTC midnight when set", () => {
    process.env.DEMO_TODAY = "2026-11-02";
    expect(getToday().toISOString()).toBe("2026-11-02T00:00:00.000Z");
  });

  it("ignores a malformed DEMO_TODAY", () => {
    process.env.DEMO_TODAY = "02/11/2026";
    const t = getToday();
    expect(t.getUTCHours()).toBe(0);
    expect(t.getUTCMinutes()).toBe(0);
  });

  it("falls back to a UTC-midnight date when DEMO_TODAY is not set", () => {
    delete process.env.DEMO_TODAY;
    const t = getToday();
    expect(t.getUTCHours()).toBe(0);
    expect(t.getUTCSeconds()).toBe(0);
  });
});