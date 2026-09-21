export type AppMode = "preview" | "live";

/** preview (default): fictional sample workspace, no sign-in, nothing persisted.
 *  live: owner sign-in and PostgreSQL records. Live errors never fall back to preview data. */
export function appMode(value = process.env.ACIDIC_MODE): AppMode {
  if (!value || value === "preview") return "preview";
  if (value === "live") return "live";
  throw new Error("ACIDIC_MODE must be preview or live.");
}

/** Live mode refuses to run half-configured: a database, a real secret and one exact
 * HTTPS origin (or localhost for a local check) for both the app and Auth.js. */
export function liveConfigured(env: Record<string, string | undefined> = process.env) {
  if (!env.DATABASE_URL || (env.AUTH_SECRET?.length ?? 0) < 32) return false;
  try {
    const url = new URL(env.APP_URL ?? "");
    const authUrl = new URL(env.AUTH_URL ?? "");
    if (url.origin !== authUrl.origin || url.pathname !== "/" || authUrl.pathname !== "/" || url.username || url.password || url.search || url.hash || authUrl.search || authUrl.hash) return false;
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  } catch { return false; }
}
