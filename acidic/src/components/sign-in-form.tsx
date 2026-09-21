"use client";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Message } from "./ui";
import { AcidicLogo } from "./acidic-logo";
export function SignInForm({ returnTo }: { returnTo?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", { email: data.get("email"), password: data.get("password"), redirect: false, redirectTo: returnTo ?? window.location.pathname });
      if (result?.error || !result?.ok) { setError("Sign-in failed. Check your details, or wait 15 minutes if you have tried several times."); return; }
      if (returnTo) router.replace(returnTo);
      router.refresh();
    } catch { setError("Sign-in is unavailable. Please try again shortly."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="sign-in-form"><AcidicLogo /><h1>Sign in to Acidic</h1><p>The Acidity workspace: programme, stock, roster and money.</p><label>Email<input type="email" name="email" autoComplete="username" maxLength={254} required /></label><label>Password<input type="password" name="password" autoComplete="current-password" maxLength={72} required /></label><Message error={error} /><button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button><p className="hint">Accounts are created by the owner from the server. There is no public registration.</p></form>;
}
