import { describe, it, expect } from "vitest";
import { canAttempt, createRateLimiter, hashOtp, verifyOtpHash } from "../lib/otp";

const secret = "test-secret-test-secret-123456";

describe("otp hashing", () => {
  it("accepts the right code", () => {
    const h = hashOtp("123456", "9000000003", secret);
    expect(verifyOtpHash("123456", "9000000003", h, secret)).toBe(true);
  });

  it("rejects a wrong code", () => {
    const h = hashOtp("123456", "9000000003", secret);
    expect(verifyOtpHash("654321", "9000000003", h, secret)).toBe(false);
  });

  it("is tied to the phone number", () => {
    const h = hashOtp("123456", "9000000003", secret);
    expect(verifyOtpHash("123456", "9000000002", h, secret)).toBe(false);
  });
});

describe("attempt limit", () => {
  it("allows 5 attempts then blocks", () => {
    expect(canAttempt(4)).toBe(true);
    expect(canAttempt(5)).toBe(false);
  });
});

describe("rate limiter", () => {
  it("blocks the 6th request inside the window", () => {
    const rl = createRateLimiter(5, 1000);
    for (let i = 0; i < 5; i++) expect(rl.check("p", 100)).toBe(true);
    expect(rl.check("p", 200)).toBe(false);
  });

  it("allows requests again after the window", () => {
    const rl = createRateLimiter(5, 1000);
    for (let i = 0; i < 5; i++) rl.check("p", 100);
    expect(rl.check("p", 1200)).toBe(true);
  });

  it("tracks phones separately", () => {
    const rl = createRateLimiter(1, 1000);
    expect(rl.check("a", 0)).toBe(true);
    expect(rl.check("b", 0)).toBe(true);
    expect(rl.check("a", 1)).toBe(false);
  });
});