import { describe, expect, it } from "vitest";
import { credentialsSchema, failedLogin, LOCK_MS, MAX_FAILURES } from "../src/lib/auth/policy";

describe("sign-in policy", () => {
  it("normalises the email and bounds the password", () => {
    expect(credentialsSchema.parse({ email: "  Owner@Acidity.com.au ", password: "x".repeat(20) }).email).toBe("owner@acidity.com.au");
    expect(credentialsSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ email: "a@b.co", password: "é".repeat(50) }).success).toBe(false);
  });
  it("locks after five failures and restarts the count once the lock expires", () => {
    const now = new Date("2026-08-10T10:00:00Z");
    expect(failedLogin(3, null, now)).toEqual({ failedLoginAttempts: 4, lockedUntil: null });
    const locked = failedLogin(MAX_FAILURES - 1, null, now);
    expect(locked.failedLoginAttempts).toBe(MAX_FAILURES);
    expect(locked.lockedUntil?.getTime()).toBe(now.getTime() + LOCK_MS);
    expect(failedLogin(5, new Date(now.getTime() - 1), now)).toEqual({ failedLoginAttempts: 1, lockedUntil: null });
  });
});
