import { describe, it, expect } from "vitest";
import { decidePayment, nextReceiptNumber } from "../lib/payments";

const inst = { id: "i1", amount: 3_000_000, paid: 0, ownerUserId: "parent-1" };

describe("decidePayment", () => {
  it("creates a payment for the full balance on success", () => {
    expect(decidePayment({ instalment: inst, userId: "parent-1", outcome: "success" })).toEqual({
      kind: "create",
      amount: 3_000_000,
    });
  });

  it("charges only the remaining balance after a part payment", () => {
    const r = decidePayment({
      instalment: { ...inst, paid: 1_500_000 },
      userId: "parent-1",
      outcome: "success",
    });
    expect(r).toEqual({ kind: "create", amount: 1_500_000 });
  });

  it("rejects a parent who does not own the instalment", () => {
    expect(decidePayment({ instalment: inst, userId: "parent-2", outcome: "success" })).toEqual({
      kind: "forbidden",
    });
  });

  it("creates no payment when the gateway fails or the parent cancels", () => {
    expect(decidePayment({ instalment: inst, userId: "parent-1", outcome: "fail" })).toEqual({
      kind: "no_payment",
      outcome: "fail",
    });
    expect(decidePayment({ instalment: inst, userId: "parent-1", outcome: "cancel" })).toEqual({
      kind: "no_payment",
      outcome: "cancel",
    });
  });

  it("refuses to charge an instalment that is already paid", () => {
    const r = decidePayment({
      instalment: { ...inst, paid: 3_000_000 },
      userId: "parent-1",
      outcome: "success",
    });
    expect(r).toEqual({ kind: "already_paid" });
  });

  it("returns the existing payment for a repeated idempotency key", () => {
    const r = decidePayment({
      instalment: inst,
      userId: "parent-1",
      outcome: "success",
      existingPayment: { id: "pay-9", instalmentId: "i1" },
    });
    expect(r).toEqual({ kind: "existing", paymentId: "pay-9" });
  });

  it("rejects an idempotency key that was used for another instalment", () => {
    const r = decidePayment({
      instalment: inst,
      userId: "parent-1",
      outcome: "success",
      existingPayment: { id: "pay-9", instalmentId: "other" },
    });
    expect(r).toEqual({ kind: "forbidden" });
  });

  it("checks ownership before honouring an idempotency key", () => {
    const r = decidePayment({
      instalment: inst,
      userId: "parent-2",
      outcome: "success",
      existingPayment: { id: "pay-9", instalmentId: "i1" },
    });
    expect(r).toEqual({ kind: "forbidden" });
  });
});

describe("nextReceiptNumber", () => {
  it("starts at 0001 when there is no receipt", () => {
    expect(nextReceiptNumber(null, 2026)).toBe("RCPT-2026-0001");
  });

  it("increments the last number", () => {
    expect(nextReceiptNumber("RCPT-2026-0067", 2026)).toBe("RCPT-2026-0068");
  });

  it("restarts when the year changes", () => {
    expect(nextReceiptNumber("RCPT-2025-0310", 2026)).toBe("RCPT-2026-0001");
  });

  it("ignores a malformed previous number", () => {
    expect(nextReceiptNumber("garbage", 2026)).toBe("RCPT-2026-0001");
  });
});