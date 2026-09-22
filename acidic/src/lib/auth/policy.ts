import { z } from "zod";
/** Sign-in is "pick a profile, type a 6-digit passcode" (decision D12). The passcode is
 * hashed like a password; what defends a six-digit code on a public page is the lockout. */
export const credentialsSchema = z.object({
  userId: z.uuid(),
  passcode: z.string().regex(/^\d{6}$/, "Passcode is 6 digits"),
});
export const PASSCODE_PATTERN = /^\d{6}$/;
export const MAX_FAILURES = 5;
export const LOCK_MS = 15 * 60 * 1000;
/** Five failed attempts lock a profile for 15 minutes; an expired lock starts the count again. */
export function failedLogin(attempts: number, lockedUntil: Date | null, now: Date) {
  const next = lockedUntil && lockedUntil <= now ? 1 : attempts + 1;
  return { failedLoginAttempts: next, lockedUntil: next >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MS) : null };
}
export const ROLES = ["owner", "manager", "staff"] as const;
export type Role = (typeof ROLES)[number];
