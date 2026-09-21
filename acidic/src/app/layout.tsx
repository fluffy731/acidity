import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Acidic · Acidity Bar & Coffee", template: "%s · Acidic" }, description: "Acidity programme, stocktake, roster and money in one place", robots: { index: false, follow: false }, appleWebApp: { capable: true, title: "Acidic", statusBarStyle: "default" }, formatDetection: { telephone: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#15130f", viewportFit: "cover" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-AU"><body><a className="skip-link" href="#main">Skip to content</a>{children}</body></html>;
}
