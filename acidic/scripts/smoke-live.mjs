#!/usr/bin/env node
/** After every deploy: is the app actually up? Health, sign-in page, and the pages a phone
 * opens first. Exit 1 on any failure so a deploy script can roll back. */
const base = process.env.ACIDIC_SMOKE_URL ?? "http://localhost:3100";
const checks = [
  { name: "login page", url: "/login", ok: [200] },
  { name: "Today", url: "/dashboard", ok: [200, 302, 307] },
  { name: "Programme", url: "/programme", ok: [200, 302, 307] },
  { name: "Roster", url: "/staffing", ok: [200, 302, 307] },
  { name: "Money", url: "/accounting", ok: [200, 302, 307] },
  { name: "events API (needs sign-in)", url: "/api/events", ok: [401, 503] },
];
let failed = 0;
for (const check of checks) {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const response = await fetch(base + check.url, { redirect: "manual", signal: controller.signal });
    clearTimeout(timer);
    const ok = check.ok.includes(response.status);
    console.log(`${ok ? "ok  " : "FAIL"} ${check.name.padEnd(28)} ${String(response.status).padStart(3)}  ${Date.now() - started}ms`);
    if (!ok) failed += 1;
  } catch (error) { console.log(`FAIL ${check.name.padEnd(28)} ---  ${error?.message ?? error}`); failed += 1; }
}
console.log(failed ? `SMOKE FAILED: ${failed} check(s)` : "SMOKE OK");
process.exit(failed ? 1 : 0);
