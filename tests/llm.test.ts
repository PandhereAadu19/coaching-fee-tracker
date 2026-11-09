import { describe, it, expect } from "vitest";
import { buildPrompt, generateRiskNote, signalsFromReasons, templateNote } from "../lib/llm";

const signals = { score: 72, overdueCount: 2, maxDaysOverdue: 43, attendanceDrop: 18, testDropPercent: 22 };
const okResponse = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

describe("signalsFromReasons", () => {
  it("reads the array format", () => {
    const s = signalsFromReasons(
      [
        { key: "overdue_instalments", value: 2 },
        { key: "attendance_drop", value: 18 },
      ],
      72
    );
    expect(s).toEqual({ score: 72, overdueCount: 2, attendanceDrop: 18 });
  });

  it("reads the object format and ignores junk", () => {
    const s = signalsFromReasons({ test_drop_percent: 22, nonsense: "x", max_days_overdue: "oops" }, 65);
    expect(s).toEqual({ score: 65, testDropPercent: 22 });
  });

  it("handles null and strings", () => {
    expect(signalsFromReasons(null, 60)).toEqual({ score: 60 });
    expect(signalsFromReasons("text", 60)).toEqual({ score: 60 });
  });
});

describe("prompt privacy", () => {
  it("contains only numbers from the signals", () => {
    const p = buildPrompt(signals);
    expect(p).toContain("72");
    expect(p).toContain("43 days");
    expect(p).not.toMatch(/\d{10}/);
  });
});

describe("generateRiskNote", () => {
  it("uses the model reply when the call works", async () => {
    const r = await generateRiskNote(signals, {
      apiKey: "k",
      fetchImpl: async () => okResponse("Flagged because of dues.\nAsk A.\nAsk B."),
    });
    expect(r.source).toBe("llm");
    expect(r.note).toContain("Flagged");
  });

  it("sends only the model, tokens and the anonymised prompt", async () => {
    let body: Record<string, unknown> = {};
    await generateRiskNote(signals, {
      apiKey: "k",
      fetchImpl: async (_u, init) => {
        body = JSON.parse(String(init.body));
        return okResponse("ok");
      },
    });
    const messages = body.messages as { role: string; content: string }[];
    expect(messages[1].content).toBe(buildPrompt(signals));
    expect(body.max_tokens).toBe(600);
  });

  it("falls back to the template when the network fails", async () => {
    const r = await generateRiskNote(signals, {
      apiKey: "k",
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });
    expect(r).toEqual({ note: templateNote(signals), source: "template" });
  });

  it("falls back on an error status", async () => {
    const r = await generateRiskNote(signals, {
      apiKey: "k",
      fetchImpl: async () => new Response("rate limited", { status: 429 }),
    });
    expect(r.source).toBe("template");
  });

  it("falls back on an empty reply", async () => {
    const r = await generateRiskNote(signals, { apiKey: "k", fetchImpl: async () => okResponse("   ") });
    expect(r.source).toBe("template");
  });

  it("falls back on a timeout", async () => {
    const r = await generateRiskNote(signals, {
      apiKey: "k",
      timeoutMs: 20,
      fetchImpl: (_u, init) =>
        new Promise((_res, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    });
    expect(r.source).toBe("template");
  });

  it("uses the template without calling the API when there is no key", async () => {
    let called = false;
    const r = await generateRiskNote(signals, {
      apiKey: "",
      fetchImpl: async () => {
        called = true;
        return okResponse("x");
      },
    });
    expect(called).toBe(false);
    expect(r.source).toBe("template");
  });
});