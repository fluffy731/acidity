"use client";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Message } from "./ui";
import { AcidicLogo } from "./acidic-logo";
import type { Profile } from "@/lib/auth/profiles";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", manager: "Manager", staff: "Staff" };

/** Pick a profile, type a 6-digit passcode. One screen, no email, no keyboard gymnastics
 * behind the bar (decision D12). */
export function SignInForm({ profiles, returnTo }: { profiles: Profile[]; returnTo?: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Profile | null>(profiles.length === 1 ? profiles[0] : null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", { userId: selected.id, passcode: data.get("passcode"), redirect: false, redirectTo: returnTo ?? window.location.pathname });
      if (result?.error || !result?.ok) { setError("That passcode didn't match. After five wrong tries this profile locks for 15 minutes."); return; }
      if (returnTo) router.replace(returnTo);
      router.refresh();
    } catch { setError("Sign-in is unavailable. Please try again shortly."); }
    finally { setBusy(false); }
  }
  if (!profiles.length) return <div className="sign-in-form"><AcidicLogo /><h1>No profiles yet</h1><p className="hint">Create the first one on the server: <code>npm run profile:create -- --role owner</code></p></div>;
  return <form onSubmit={submit} className="sign-in-form"><AcidicLogo /><h1>Who&apos;s signing in?</h1>
    <div className="profile-tiles" role="radiogroup" aria-label="Profile">
      {profiles.map((profile) => <button key={profile.id} type="button" role="radio" aria-checked={selected?.id === profile.id} className={`profile-tile${selected?.id === profile.id ? " selected" : ""}`} onClick={() => { setSelected(profile); setError(""); }}><strong>{profile.name}</strong><span>{ROLE_LABEL[profile.role] ?? profile.role}</span></button>)}
    </div>
    {selected ? <>
      <label>Passcode for {selected.name}<input key={selected.id} type="password" name="passcode" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="current-password" autoFocus required placeholder="6 digits" /></label>
      <Message error={error} />
      <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </> : <p className="hint">Tap your profile, then enter your 6-digit passcode.</p>}
  </form>;
}
