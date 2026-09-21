# Acidic architecture

**Last updated:** 21 September 2026

## System shape

One responsive Next.js application with server-side services, PostgreSQL for every record,
and a copy-and-paste export for the static website. The same framework as Monnie; a different
business.

```text
Phone / laptop browser (owner, manager, staff)
        |
Next.js application and authenticated API (Auth.js, same-origin writes, Zod)
        |
Deterministic services (programme, stock, staffing, accounting) + Today overview
        |
PostgreSQL (Drizzle, forward-only migrations, check constraints, audit log)
        |
Website export  ->  acidity.com.au (static HTML, updated from the export)
```

## Layers

- `src/app` - screens (`(workspace)/…`) and API routes (`api/…`).
- `src/components` - shell, sign-in, shared UI. Server components except the three client islands.
- `src/lib/mode.ts` - preview/live guard. `src/lib/http.ts` - role checks, origin, bounded JSON,
  error mapping. `src/lib/money.ts` - the only place money arithmetic happens.
- `src/lib/programme` - vocabulary, input schema, status workflow, date conflicts, **website
  export**, live service.
- `src/lib/stock` - vocabulary, schemas, valuation / usage / reorder engine, live service.
- `src/lib/staffing` - vocabulary, schemas, roster engine (hours, cost, overlaps, coverage), live service.
- `src/lib/accounting` - vocabulary, schemas, ledger engine (split, P&L, BAS, daily), live service.
- `src/lib/today/overview.ts` - the cross-domain view, pure.
- `src/lib/data` - `fixtures.ts` (preview workspace) and `source.ts` (the one read path; preview
  or live, never both).
- `src/db` - Drizzle schema and client. `drizzle/` - generated SQL migrations.
- `tests` - unit tests per engine plus an opt-in PostgreSQL integration suite.
- `scripts` - owner provisioning, readiness, database test runner, post-deploy smoke.
- `deploy` - Caddyfile and nightly backup loop.

## Data ownership

| Data | Source of truth |
|---|---|
| Events, stock, counts, movements, staff, shifts, ledger, audit | PostgreSQL |
| Public programme on the website | Derived from PostgreSQL via the website export |
| Source, schema, migrations, rules | Git (`fluffy731/acidity`, folder `acidic/`) |
| Nightly database dumps | `ACIDIC_BACKUP_DIR` (a synced folder off the machine) |

## Security boundaries

- Live APIs require a signed-in user; the role needed is per route (`requireRole`).
- Writes require the exact configured Origin, JSON content and bodies under 250 KB.
- Identity, timestamps and audit entries come from the server, never the request.
- Secrets live in `deploy/.env` (git-ignored) as container environment variables.
- Preview mode cannot reach the database; live mode never falls back to preview data.
- Database errors are logged server-side and never serialised into responses.

## Deployment

- Development: `npm run dev` (preview) or `.env.local` with `ACIDIC_MODE=live`.
- Live: Docker Engine/Desktop on a machine that stays on, `compose.yaml` + `compose.live.yaml`
  (app, PostgreSQL 17, backup loop, tools container), HTTPS by Caddy (`--profile https`) or a
  Cloudflare Tunnel in front of port 3100 - the same path Monnie uses.
- CI: `.github/workflows/verify-acidic.yml` runs on changes under `acidic/**`.

## Constraints

- Modular monolith; no services split out without a demonstrated need.
- Money is integer cents; the database re-checks every split.
- Records are voided or superseded, never silently edited: the audit log explains every change.
- The website export must keep matching the strings on acidity.com.au; its tests assert them.
