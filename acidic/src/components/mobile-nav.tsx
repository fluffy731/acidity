"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

// The sidebar hides behind a menu button below 900px; header and panel share one open
// flag through context because the shell itself stays a Server Component.
const MobileNavContext = createContext<{ open: boolean; toggle: () => void }>({ open: false, toggle: () => {} });

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) { setLastPathname(pathname); if (open) setOpen(false); }
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <MobileNavContext.Provider value={{ open, toggle: () => setOpen((value) => !value) }}>{children}</MobileNavContext.Provider>;
}
export function MobileNavButton() {
  const { open, toggle } = useContext(MobileNavContext);
  return <button type="button" className="mobile-nav-button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={toggle}>{open ? "✕" : "☰"}</button>;
}
export function MobileNavPanel({ children }: { children: ReactNode }) {
  const { open } = useContext(MobileNavContext);
  return <div className={`mobile-nav-panel${open ? " open" : ""}`}>{children}</div>;
}
