import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "../lib/session-token";
import { checkRole, decideAccess } from "../lib/roles";

const secret = "test-secret-test-secret-123456";
const payload = { userId: "u1", role: "PARENT" as const };

describe("session token", () => {
  it("signs and verifies", async () => {
    const t = await signSession(payload, { secret });
    expect(await verifySession(t, { secret })).toEqual(payload);
  });

  it("rejects an expired token", async () => {
    const t = await signSession(payload, { secret, expiresInSeconds: -60 });
    expect(await verifySession(t, { secret })).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const t = await signSession(payload, { secret });
    const parts = t.split(".");
    parts[1] = parts[1].slice(0, -1) + (parts[1].endsWith("A") ? "B" : "A");
    expect(await verifySession(parts.join("."), { secret })).toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const t = await signSession(payload, { secret: "another-secret-another-secret-1" });
    expect(await verifySession(t, { secret })).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifySession("not-a-token", { secret })).toBeNull();
  });
});

describe("checkRole", () => {
  it("handles all three outcomes", () => {
    expect(checkRole(null, "PARENT")).toBe("unauthenticated");
    expect(checkRole({ role: "ACCOUNTS" }, "PARENT")).toBe("forbidden");
    expect(checkRole({ role: "PARENT" }, "PARENT")).toBe("ok");
  });
});

describe("decideAccess", () => {
  it("login and auth APIs are public", () => {
    expect(decideAccess(null, "/login")).toBe("allow");
    expect(decideAccess(null, "/api/auth/verify-otp")).toBe("allow");
  });

  it("anonymous users are sent to login", () => {
    expect(decideAccess(null, "/home")).toBe("login");
    expect(decideAccess(null, "/api/pay")).toBe("login");
  });

  it("parents cannot open accounts pages or APIs", () => {
    expect(decideAccess("PARENT", "/dashboard")).toBe("forbidden");
    expect(decideAccess("PARENT", "/students/abc")).toBe("forbidden");
    expect(decideAccess("PARENT", "/api/refunds")).toBe("forbidden");
    expect(decideAccess("PARENT", "/api/payments/assign")).toBe("forbidden");
  });

  it("accounts users cannot open parent pages or APIs", () => {
    expect(decideAccess("ACCOUNTS", "/home")).toBe("forbidden");
    expect(decideAccess("ACCOUNTS", "/pay/abc")).toBe("forbidden");
    expect(decideAccess("ACCOUNTS", "/api/pay")).toBe("forbidden");
  });

  it("each role can use its own area", () => {
    expect(decideAccess("PARENT", "/receipts/1")).toBe("allow");
    expect(decideAccess("ACCOUNTS", "/queues")).toBe("allow");
  });

  it("does not confuse /api/pay with /api/payments", () => {
    expect(decideAccess("ACCOUNTS", "/api/payments")).toBe("allow");
    expect(decideAccess("PARENT", "/api/pay/x")).toBe("allow");
  });
});