import { describe, it, expect } from "vitest";
import en from "../messages/en.json";
import hi from "../messages/hi.json";
import { dictionaries, normaliseLang, translate } from "../lib/i18n";

const E = en as Record<string, string>;
const H = hi as Record<string, string>;
const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe("i18n dictionaries", () => {
  it("English and Hindi have exactly the same keys", () => {
    expect(Object.keys(H).sort()).toEqual(Object.keys(E).sort());
  });

  it("no message is empty", () => {
    for (const [k, v] of [...Object.entries(E), ...Object.entries(H)]) {
      expect(v.trim().length, k).toBeGreaterThan(0);
    }
  });

  it("Hindi messages keep the same {placeholders}", () => {
    for (const k of Object.keys(E)) expect(placeholders(H[k]), k).toEqual(placeholders(E[k]));
  });

  it("Hindi text contains Devanagari", () => {
    expect(H["nav.home"]).toMatch(/[\u0900-\u097F]/);
  });
});

describe("translate", () => {
  it("fills placeholders", () => {
    expect(translate(dictionaries.en, "parent.hello", { name: "Asha" })).toBe("Hello, Asha");
    expect(translate(dictionaries.hi, "parent.daysOverdue", { days: 23 })).toContain("23");
  });

  it("falls back to English for unknown language values", () => {
    expect(normaliseLang("fr")).toBe("en");
    expect(normaliseLang(undefined)).toBe("en");
    expect(normaliseLang("hi")).toBe("hi");
  });
});