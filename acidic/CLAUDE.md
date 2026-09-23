# Acidic - read this first, every session

This folder is the Acidic app inside the `fluffy731/acidity` repository (the website is at the
repository root). Before doing anything else:

1. Read `README.md`, `ACIDIC_STATUS.md` and `ACIDIC_DECISIONS.md` - status may be a few
   commits stale, so also run `git status --short --branch` and `git log --oneline -10`.
2. Work from `acidic/`: `npm ci`, then `npm test`, `npm run typecheck`, `npm run lint`,
   `npm run build`. All four must pass before a commit is described as verified.

## Rules that do not change

- **Money is integer cents.** Every amount goes through `src/lib/money.ts`. Never `* 0.1`,
  never `toFixed` for arithmetic, never a float sum over rows. GST is 10% of a subtotal or one
  eleventh of a gross, half up - one method. The database re-checks every stored split.
- **Schemas at every boundary.** Input is parsed with the Zod schema in the domain's `lib/*`
  before a service touches it. Services take `(actorId, raw)`; identity comes from the session.
- **Services are transactions with an audit row.** Nothing mutates outside `db().transaction`,
  and every mutation inserts into `audit_log`.
- **Preview never touches the database; live never falls back to fixtures.** `loadWorkspace`
  is the only read path.
- **The website export must keep matching acidity.com.au.** `tests/website-export.test.ts`
  asserts the literal strings on the site. If the site's format changes, change the test
  deliberately, in the same commit, and say why in `ACIDIC_DECISIONS.md`.
- **No invented business facts.** Rates, prices, costs and award rules are entered by the
  owner, never assumed in code. Fixtures are labelled fictional. The seeded stock list carries
  cost 0 for this reason (D15) - never fill one in to make a screen look finished.
- **Migrations are forward-only.** `npm run db:generate` after a schema change; review the
  SQL; never edit an applied migration.
- **Live data discipline.** There is no staging. A command against `deploy/.env` runs on the
  bar's real records. Read before you write; prefer the app's own services over raw SQL.

## Where things are

`src/lib/{programme,stock,staffing,accounting,recipes}` - vocabulary, schemas, pure engine,
live service. `src/lib/today/overview.ts` - the cross-domain view. `src/app/(workspace)` - screens.
`src/app/api` - routes (thin: auth, origin, JSON, service, error). `data/programme.json`, `data/stock.json` and
`data/recipes.json` - the bar's reference data, applied with `scripts/seed-programme.mjs` and
`scripts/seed-bar.mjs`, checked against the app's own rules by `tests/programme-seed.test.ts`
and `tests/bar-seed.test.ts`. `docs/SETUP_STEP_BY_STEP.md` - how the live
installation is built and operated.
