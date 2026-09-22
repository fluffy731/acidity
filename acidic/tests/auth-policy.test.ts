import { describe, expect, it } from "vitest";
import { credentialsSchema, failedLogin, LOCK_MS, MAX_FAILURES, PASSCODE_PATTERN } from "../src/lib/auth/policy";

const id = "6b1f2f3e-1111-4a5b-8c9d-000000000001";

describe("sign-in policy: profile + 6-digit passcode", () => {
  it("accepts a profile id with a six-digit passcode and nothing else", () => {
    expect(credentialsSchema.safeParse({ userId: id, passcode: "123456" }).success).toBe(true);
    expect(credentialsSchema.safeParse({ userId: id, passcode: "12345" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ userId: id, passcode: "1234567" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ userId: id, passcode: "12a456" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ userId: "not-a-uuid", passcode: "123456" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ email: "a@b.co", password: "123456" }).success).toBe(false);
    expect(PASSCODE_PATTERN.test("000000")).toBe(true);
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
