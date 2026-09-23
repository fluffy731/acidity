import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/auth";
import { AcidicLogo } from "./acidic-logo";
import { MobileNavButton, MobileNavPanel, MobileNavProvider } from "./mobile-nav";

/** Today / Programme / Cocktails / Stock / Roster / Money. Staff see the roster, the
 * programme and the recipe book - a bartender needs the specs on shift. */
export function AppShell({ children, live = false, user }: { children: ReactNode; live?: boolean; user?: { name: string; role: string } | null }) {
  const manager = !user || ["owner", "manager"].includes(user.role);
  return <MobileNavProvider><header className="app-header"><Link href="/dashboard" className="brand" aria-label="Acidic Today"><AcidicLogo /></Link><MobileNavButton /><nav aria-label="Main navigation"><Link href="/dashboard">Today</Link><Link href="/programme">Programme</Link><Link href="/recipes">Cocktails</Link><Link href="/staffing">Roster</Link>{manager ? <Link href="/accounting">Money</Link> : null}</nav><div className="header-right"><span>{live ? `${user?.name ?? "Signed in"} · ${user?.role ?? ""}` : "Preview"}</span>{live ? <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="secondary">Sign out</button></form> : <Link href="/login">Exit preview</Link>}</div></header>
    {!live ? <aside className="preview-banner"><strong>Working preview</strong><span>Fictional Acidity data · Nothing is saved · Set ACIDIC_MODE=live for real records</span></aside> : null}
    <div className="workspace-layout"><MobileNavPanel><aside className="workspace-sidebar" aria-label="Workspace">
      <Link href="/dashboard" className="nav-primary">Today</Link>
      <Link href="/programme" className="nav-primary">Programme</Link>
      <div className="nav-sub"><Link href="/programme/website">Website export</Link></div>
      {manager ? <><Link href="/stock" className="nav-primary">Stock</Link><div className="nav-sub"><Link href="/stock#reorder">Reorder list</Link><Link href="/stock#usage">Usage since last count</Link></div></> : null}
      <Link href="/recipes" className="nav-primary">Cocktails</Link>
      <Link href="/staffing" className="nav-primary">Roster</Link>
      {manager ? <><Link href="/accounting" className="nav-primary">Money</Link><div className="nav-sub"><Link href="/accounting#ledger">Ledger</Link><Link href="/accounting#bas">BAS quarter</Link></div></> : null}
      {live ? <form className="sidebar-signout" action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><span>{user?.name}</span><button className="secondary">Sign out</button></form> : null}
    </aside></MobileNavPanel><main id="main" className="container">{children}</main></div><footer>Acidity Bar &amp; Coffee <span>·</span> Acidic<span className="footer-note">{live ? "Live records" : "Preview only - not a business record."}</span></footer></MobileNavProvider>;
}
