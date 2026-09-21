import { AppShell } from "@/components/app-shell";
import { SignInForm } from "@/components/sign-in-form";
import { appMode, liveConfigured } from "@/lib/mode";
import { currentUser } from "@/auth";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  if (appMode() === "preview") return <AppShell>{children}</AppShell>;
  if (!liveConfigured()) return <main id="main" className="container"><h1>Acidic setup is incomplete</h1><p>Finish the database and sign-in configuration, then restart the app.</p></main>;
  let user;
  try { user = await currentUser(); }
  catch { return <main id="main" className="container"><h1>Acidic is temporarily unavailable</h1><p>Try again shortly. Saved records have not changed.</p></main>; }
  if (!user) return <main id="main" className="welcome-content"><SignInForm /></main>;
  return <AppShell live user={user}>{children}</AppShell>;
}
