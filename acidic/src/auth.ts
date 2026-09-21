import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { appMode, liveConfigured } from "@/lib/mode";
import { credentialsSchema, failedLogin, ROLES } from "@/lib/auth/policy";

// Valid bcrypt cost-12 dummy hash used only for unknown-user timing.
const DUMMY_HASH = "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";

export const { auth, handlers, signOut } = NextAuth({
  pages: { signIn: "/login" },
  // A bar phone or the office laptop stays signed in for 14 days, or until sign-out.
  session: { strategy: "jwt", maxAge: 14 * 24 * 60 * 60 },
  providers: [Credentials({
    credentials: { email: { type: "email" }, password: { type: "password" } },
    async authorize(input) {
      if (appMode() !== "live" || !liveConfigured()) return null;
      const parsed = credentialsSchema.safeParse(input);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;
      const [candidate] = await db().select().from(users).where(eq(users.email, email)).limit(1);
      const matches = await compare(password, candidate?.passwordHash ?? DUMMY_HASH);
      if (!candidate?.passwordHash) return null;
      return db().transaction(async (tx) => {
        const [user] = await tx.select().from(users).where(eq(users.id, candidate.id)).for("update");
        const now = new Date();
        if (!user || !(ROLES as readonly string[]).includes(user.role) || user.passwordHash !== candidate.passwordHash || (user.lockedUntil && user.lockedUntil > now)) return null;
        if (!matches) {
          await tx.update(users).set(failedLogin(user.failedLoginAttempts, user.lockedUntil, now)).where(eq(users.id, user.id));
          return null;
        }
        await tx.update(users).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
        return { id: user.id, email: user.email, name: user.name };
      });
    },
  })],
  callbacks: {
    jwt({ token, user }) { if (user) token.sub = user.id; return token; },
    session({ session, token }) { if (session.user && token.sub) session.user.id = token.sub; return session; },
  },
});

export type SessionUser = { id: string; name: string; role: string };

export async function currentUser(): Promise<SessionUser | null> {
  if (appMode() !== "live" || !liveConfigured()) return null;
  const session = await auth();
  if (!session?.user?.id) return null;
  const [user] = await db().select({ id: users.id, name: users.name, role: users.role }).from(users).where(eq(users.id, session.user.id)).limit(1);
  return user ?? null;
}
