import Link from "next/link";
import { redirect } from "next/navigation";
import { AcidicLogo } from "@/components/acidic-logo";
import { SignInForm } from "@/components/sign-in-form";
import { appMode, liveConfigured } from "@/lib/mode";
import { currentUser } from "@/auth";
import { listProfiles } from "@/lib/auth/profiles";
export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };
export default async function Login() {
  if (appMode() === "live") {
    if (!liveConfigured()) return <main id="main" className="welcome-content"><h1>Acidic setup is incomplete</h1><p>Finish the database and sign-in configuration in deploy/.env, then restart.</p></main>;
    const user = await currentUser().catch(() => undefined);
    if (user === undefined) return <main id="main" className="welcome-content"><h1>Sign-in is temporarily unavailable</h1><p>Acidic could not reach its database. Try again shortly.</p><Link href="/login">Try again</Link></main>;
    if (user) redirect("/dashboard");
    return <main id="main" className="welcome-content"><SignInForm profiles={await listProfiles()} returnTo="/dashboard" /></main>;
  }
  return <div className="welcome"><header className="app-header"><span className="brand"><AcidicLogo /></span></header><main id="main" className="welcome-content"><h1>The bar, in one place.</h1><p className="welcome-intro">Programme, stocktake, roster and money for Acidity Bar &amp; Coffee - and the export that keeps acidity.com.au in step.</p><div className="welcome-preview"><h2>Open the working preview</h2><p>Fictional Acidity data seeded with the August programme. Nothing you see here is a business record.</p><Link href="/dashboard" className="button">Open preview →</Link><p className="hint">No login needed. Set ACIDIC_MODE=live with a database for real records - see docs/SETUP_STEP_BY_STEP.md.</p></div></main><footer>Acidity Bar &amp; Coffee <span>·</span> Acidic</footer></div>;
}
