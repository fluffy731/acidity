import { z } from "zod";
export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(1).max(72).refine((value) => new TextEncoder().encode(value).length <= 72),
});
export const MAX_FAILURES = 5;
export const LOCK_MS = 15 * 60 * 1000;
/** Five failed attempts lock an account for 15 minutes; an expired lock starts the count again. */
export function failedLogin(attempts: number, lockedUntil: Date | null, now: Date) {
  const next = lockedUntil && lockedUntil <= now ? 1 : attempts + 1;
  return { failedLoginAttempts: next, lockedUntil: next >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MS) : null };
}
export const ROLES = ["owner", "manager", "staff"] as const;
export type Role = (typeof ROLES)[number];
