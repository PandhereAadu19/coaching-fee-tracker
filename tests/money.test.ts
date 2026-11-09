import { describe, it, expect } from "vitest";
import { formatINR, splitGstInclusive, toRupees } from "../lib/money";

describe("money", () => {
  it("converts paise to rupees", () => {
    expect(toRupees(3000000)).toBe(30000);
  });

  it("formats whole rupees without decimals", () => {
    expect(formatINR(3000000)).toBe("₹30,000");
  });

  it("formats paise with two decimals", () => {
    expect(formatINR(1234550)).toBe("₹12,345.50");
  });

  it("uses Indian digit grouping", () => {
    expect(formatINR(10000000)).toBe("₹1,00,000");
  });

  it("splits GST exactly for a round number", () => {
    expect(splitGstInclusive(118000, 18)).toEqual({ base: 100000, gst: 18000, total: 118000 });
  });

  it("base + gst always equals total", () => {
    for (const total of [1, 99, 3000000, 4000000, 3200000, 1234567]) {
      const r = splitGstInclusive(total, 18);
      expect(r.base + r.gst).toBe(total);
      expect(Number.isInteger(r.base)).toBe(true);
    }
  });

  it("splits 30000 rupees correctly", () => {
    expect(splitGstInclusive(3000000, 18)).toEqual({ base: 2542373, gst: 457627, total: 3000000 });
  });
});