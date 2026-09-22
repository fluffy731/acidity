import { isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { isLive } from "@/lib/data/source";

export type Profile = { id: string; name: string; role: string };

/** The tiles on the sign-in page: every profile that has a passcode, owner first, then
 * managers, then staff, alphabetical within each. Names only - no emails, no hashes. */
export async function listProfiles(): Promise<Profile[]> {
  if (!isLive()) return [];
  const rows = await db().select({ id: users.id, name: users.name, role: users.role }).from(users).where(isNotNull(users.passwordHash));
  const order: Record<string, number> = { owner: 0, manager: 1, staff: 2 };
  return rows.sort((a, b) => (order[a.role] ?? 3) - (order[b.role] ?? 3) || a.name.localeCompare(b.name));
}
