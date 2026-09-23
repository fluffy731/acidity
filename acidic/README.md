# Acidic · Acidity Bar & Coffee

One workspace for running the bar: **programme** (gigs, day sessions, private bookings),
**stocktake** (counts, deliveries, waste, reorder), **staffing** (roster, hours, base wage cost,
gig-night coverage) and **money** (takings, purchases, wages, P&L, working BAS figures) - plus
the **website export** that renders acidity.com.au's programme blocks from the same record.

Built on the engineering framework proven in Monnie (Lingenious): one responsive Next.js app,
PostgreSQL through Drizzle, deterministic services with strict Zod schemas, money in integer
cents, preview/live runtime modes, Docker + PostgreSQL self-hosting behind the existing
Cloudflare tunnel, GitHub Actions
verification, and a small set of maintained project records. Acidic is a bar's tool, not a
consultancy's: there are no enquiries, proposals or engineering documents here.

## Maintained project records

- [ACIDIC_SPEC.md](ACIDIC_SPEC.md) - what the app does and the rules it enforces.
- [ACIDIC_ARCHITECTURE.md](ACIDIC_ARCHITECTURE.md) - system shape, layers, boundaries.
- [ACIDIC_DECISIONS.md](ACIDIC_DECISIONS.md) - append-only decision register.
- [ACIDIC_STATUS.md](ACIDIC_STATUS.md) - what is verified, what is not, next priorities.
- [docs/SETUP_STEP_BY_STEP.md](docs/SETUP_STEP_BY_STEP.md) - the live setup, the way Monnie was set up.
- [CLAUDE.md](CLAUDE.md) - session start rules for Claude Code.

## Current state

A **working browser preview** and the implemented live workflow:

- Twelve PostgreSQL tables with check constraints that make bad records impossible: a booking link
  only on a ticketed/RSVP event, a consistent GST split on every ledger entry, positive stock
  movements, valid roles and statuses.
- Deterministic engines with unit tests: event status workflow and date conflicts, website
  export (asserted against the exact strings on acidity.com.au today), stock valuation, usage
  between counts, reorder-to-par, roster hours/cost/overlaps/coverage, cash-basis P&L and BAS.
- Live services in transactions with an append-only audit log: create/update events, stock
  items, counts and movements, staff and shifts, ledger entries and voids.
- Profile-tile sign-in with a 6-digit passcode (owner / manager / staff), five-failure lockout,
  same-origin write protection, bounded JSON.
- Six screens: Today (the cross-domain view), Programme (+ Website export), Cocktails, Stock,
  Roster, Money - the Stock and Cocktails screens are card lists built for a phone, where a
  cost, a delivery, a stocktake or a spec is edited in place.
- The bar's reference data as editable files: `data/stock.json` (153 lines, from the menu's own
  back bar plus everything the cocktail specs need) and `data/recipes.json` (the house list and
  the classics), applied with `npm run seed:bar`, which links each ingredient to the bottle it
  pours from. Costs and par levels are deliberately unset - see decision D15.
- The programme as one editable file, `data/programme.json`, applied with `npm run programme:seed`
  (dry run by default, keyed on date and title so it is safe to re-run, never deletes) and
  validated against the app's own event rules in CI.
- Docker multi-stage image, `compose.yaml` (preview) + `compose.live.yaml` (PostgreSQL, nightly
  backups, on-demand tools container) with hard memory/CPU caps so Acidic stays small next to
  Monnie, HTTPS from the existing Cloudflare tunnel, GitHub Actions running tests, typecheck,
  lint, migration check, PostgreSQL integration tests, production build and a container smoke test.

This is **not yet verified for live business use**. The live path is implemented behind
`ACIDIC_MODE=live` and needs an acceptance run on your own installation - see the setup guide.

## Try the preview

```bash
cd acidic
npm ci
npm run dev
```

Open http://localhost:3000 and choose **Open preview**. No accounts or environment variables
are needed. The preview is seeded with the August 2026 programme so the Website export can be
compared with the live site. Nothing in the preview is saved.

## Verify

```bash
npm test          # 74 unit tests
npm run typecheck
npm run lint
npm run db:check  # migration metadata
npm run build
```

`npm run test:db` runs the four PostgreSQL integration tests against a disposable, migrated
database (`RUN_DATABASE_TESTS=1`, `TEST_DATABASE_URL=...` in `.env.test.local`); CI does this.

## Money rules

Amounts are AUD dollars at the API boundary and integer cents everywhere else. GST is 10% of a
GST-exclusive subtotal, or one eleventh of a GST-inclusive total, rounded half up - one method,
in `src/lib/money.ts`, used by the ledger, the P&L and the BAS. The BAS figures are a working
summary for the bookkeeper, not lodgement advice. Wages are recorded at base hourly rate; award
penalty rates are deliberately not computed (decision D3).

## Repository

Acidic lives in the `acidic/` folder of `fluffy731/acidity` alongside the static website it
feeds. CI is `.github/workflows/verify-acidic.yml` at the repository root and only runs when
`acidic/**` changes. It can be moved to its own repository later without changing anything
inside this folder.
