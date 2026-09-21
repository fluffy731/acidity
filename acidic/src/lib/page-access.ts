import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { isLive } from "@/lib/data/source";
import type { Role } from "@/lib/auth/policy";

const RANK: Record<Role, number> = { staff: 1, manager: 2, owner: 3 };

/** Screens enforce the same role as their APIs: the nav hiding a link is not access control.
 * In preview there is no user and every screen is open. Returns whether the viewer manages. */
export async function requirePageRole(minimum: Role): Promise<{ manager: boolean }> {
  if (!isLive()) return { manager: true };
  const user = await currentUser();
  const rank = user ? RANK[user.role as Role] ?? 0 : 0;
  if (rank < RANK[minimum]) redirect("/dashboard");
  return { manager: rank >= RANK.manager };
}
