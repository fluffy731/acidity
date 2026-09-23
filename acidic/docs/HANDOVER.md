# Acidic — handover

**Written:** 23 September 2026, from the cloud session that built it.
**Branch:** `claude/programme-content-update-flpkoy` in `fluffy731/acidity`.
**Read first:** `CLAUDE.md`, then `ACIDIC_STATUS.md` and `ACIDIC_DECISIONS.md`. This file is the
orientation; those three are the maintained record and win if they disagree with this.

---

## 1. What Acidic is

One Next.js app for running Acidity Bar & Coffee: **programme** (gigs), **stock** (counts,
deliveries, reorder), **cocktails** (recipes linked to stock), **staffing** (roster, wage cost)
and **money** (takings, P&L, working BAS figures), plus a **website export** that renders
acidity.com.au's programme blocks from the same record.

It lives in `acidic/` inside the website repository. The static site is at the repo root; CI is
path-filtered so website-only commits don't build the app.

It is **running live** on the owner's always-on Windows desktop at
`https://acidic.lingenious.com.au`, behind the Cloudflare tunnel Monnie already uses. Solomon is
signed in and using it.

---

## 2. Do this first — the branch is 44 commits behind `main`

```
git fetch origin main
git log --oneline HEAD..origin/main | head
```

`main` has moved on with website work (a homepage programme carousel, ~30 poster images). This
branch has none of it. Everything in `acidic/` is only on this branch; everything in the
carousel work is only on main. **Merge main into this branch before doing anything to the
website files**, or the next website edit will be made against a month-old homepage.

```
git merge origin/main        # expect conflicts only in index.html / events.html, if any
```

Policy agreed with Solomon: **website content changes go straight to `main`**; the Acidic app
stays on this branch (the repo is public — see §8).

### What main's homepage actually says now

I checked, and it corrects something I told Solomon earlier. The site is **not** showing a
finished August programme. `data-events` on main is `'{}'` (the calendar was emptied) and the
homepage now carries an October feature programme:

> **We Want Miles** — Three Nights · Three Sets · Three Eras
> Night 01 Fri 9 Oct · 8PM · Night 02 Sat 10 Oct · 8PM · Night 03 Sun 11 Oct · 8PM
> General $35, Early bird $25, early bird ends 03 Oct

`acidic/data/programme.json` is **empty**, so Acidic does not know about any of this. Loading
those three nights is a ten-minute job and the obvious first content task (§7).

---

## 3. Running it

```bash
cd acidic
npm ci
npm run dev            # http://localhost:3000 → "Open preview", no database needed
```

Preview mode is fictional data and is never a business record. Everything real happens in live
mode, which refuses to start without a database, a 32+ character `AUTH_SECRET` and one exact
HTTPS origin (`APP_URL` = `AUTH_URL`; localhost is allowed).

### Verify — all five must pass before calling anything done

```bash
npm test         # 74 unit tests
npm run typecheck
npm run lint
npm run db:check
npm run build
```

`npm run test:db` runs the PostgreSQL integration tests (`RUN_DATABASE_TESTS=1` and
`TEST_DATABASE_URL` in `.env.test.local`). CI does this on every push touching `acidic/**`.

---

## 4. The live installation

Full instructions: **`docs/SETUP_STEP_BY_STEP.md`** (13 steps). Summary for a session that has
to touch the running system:

- Windows desktop, Docker Desktop, three containers: `acidic-app-1` (512 MB cap, host port
  3100), `acidic-db-1` (PostgreSQL 17, 384 MB), `acidic-backup-1` (128 MB, nightly dump to a
  OneDrive folder). A `tools` container runs on demand for migrations and seeds.
- Secrets live in `acidic/deploy/.env`, which is git-ignored and **must never be pasted into a
  chat**. Never run `down --volumes` from Monnie's folder — it would delete Monnie's database.
- Deploy: `git pull`, then

```powershell
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml up -d --build --wait app backup
node scripts/smoke-live.mjs
```

- New migration in the pull? Run the tools container first:

```powershell
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml --profile tools build tools
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml --profile tools run --rm tools
```

**There is no staging.** A command against `deploy/.env` runs on the bar's real records.

---

## 5. How it is built

```
src/lib/{programme,stock,staffing,accounting,recipes}/
    vocab.ts     the words (statuses, categories, units) — one source for app and database
    engine.ts    Zod schemas + pure functions, no I/O, heavily unit-tested
    service.ts   live writes: a transaction plus an audit_log row, always
src/lib/today/overview.ts   the cross-domain "what needs doing" view
src/lib/data/source.ts      loadWorkspace() — THE only read path (fixtures in preview, DB in live)
src/app/(workspace)/        screens          src/app/api/  thin routes: auth, origin, JSON, service, error
data/*.json                 the bar's reference data (§6)
drizzle/                    forward-only migrations: 0000 tables, 0001 optional email, 0002 recipes
```

**Rules that do not change** (the long form is in `CLAUDE.md`):

- **Money is integer cents**, always through `src/lib/money.ts`. GST is 10% of a subtotal or one
  eleventh of a gross, half up — one method, re-checked by database constraints.
- **Zod at every boundary.** Services take `(actorId, raw)`; identity comes from the session,
  never the request body.
- **Every mutation is a transaction with an audit row.**
- **Preview never touches the database; live never falls back to fixtures.**
- **No invented business facts.** Costs, rates and prices are entered by the owner. The seeded
  stock list carries cost `0` for exactly this reason (decision D15) — *never* fill one in to
  make a screen look finished.
- **Migrations are forward-only.** `npm run db:generate`, review the SQL, never edit an applied one.
- **The website export must keep matching acidity.com.au.** `tests/website-export.test.ts`
  asserts literal strings from the site; change it deliberately and record why in
  `ACIDIC_DECISIONS.md`.

Sign-in is a **profile tile plus a 6-digit passcode** (D12), bcrypt cost 12, five failures locks
a profile for 15 minutes. Profiles are made server-side:
`scripts/create-profile.mjs --role owner|manager|staff`; re-running with an existing name resets
that passcode. Roles are owner / manager / staff, enforced on both the API and the page.

---

## 6. The data files, and how they load

Reference data is editable JSON, applied by a script, keyed on a natural name so it can be run
repeatedly. **Nothing is ever deleted by a seed.** CI validates each file against the app's own
schemas, so a bad row fails on a laptop rather than at the bar.

| File | Loads with | State |
|---|---|---|
| `data/programme.json` | `npm run programme:seed` | **empty** — see §2 |
| `data/programme.example.json` | never (reference only) | the August 2026 programme, one worked example of every status |
| `data/stock.json` | `npm run seed:bar` | 153 lines, **every cost and par 0** |
| `data/recipes.json` | `npm run seed:bar` | 45 recipes (21 house, 24 classic) |

Both seeds **report and roll back** unless given `--apply`, and take `--as "<profile>"` to
attribute the audit rows. Run them through the tools container in live:

```powershell
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml --profile tools run --rm tools node scripts/seed-bar.mjs
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml --profile tools run --rm tools node scripts/seed-bar.mjs --apply
```

`./data` is bind-mounted into the tools container, so editing a file on the desktop takes effect
with no rebuild.

### Stock

153 lines built from the bar's own `menu.html`: every spirit by name, six kegs with breweries,
12 wines, 6 sakes, the printed mixer list — plus every liqueur, bitter, syrup and piece of
produce the cocktail specs need (Campari, Suze, Cynar, Lillet Blanc, the vermouths, Branca
Menta, crème de cacao, Luxardo, the fruit liqueurs, umeshu…).

**Unit cost and par level are 0 on all 153.** The seed will never overwrite one that has been
set, so filling them in is safe and incremental. Until they are set, stock value, the reorder
list and cost of goods all read as zero.

### Recipes

A recipe is what the bar *makes*; a stock line is what it *buys*; one bottle serves many drinks
— hence separate tables (D16). Every measure carries its ingredient as written text plus, where
the names match exactly, the stock line it pours from. The seed links them automatically: **147
of 179 measures** self-link.

The 32 that don't are decisions, not bugs — the house pours and the house preparations:

| Ingredient | Drinks | Ingredient | Drinks |
|---|---|---|---|
| Gin | 9 | Espresso | 2 |
| Vodka | 5 | Tea base | 2 |
| Bourbon | 4 | Dark Rum | 2 |
| Tequila | 3 | White Rum | 2 |
| Sake | 1 | Blended Scotch | 1 |
| Hot filter coffee | 1 | | |

They are listed on the Cocktails screen; choosing the bottle on the ingredient is a two-tap job.

---

## 7. Outstanding work, in the order I would do it

1. **Merge `origin/main`** into this branch (§2). Nothing else touching the website is safe first.
2. **Enter unit costs and par levels** on the Stock screen. This is the single thing blocking
   every number in the app from being real. It needs whoever knows the invoices — do not guess,
   and do not let a model guess.
3. **Load the October programme** — `data/programme.json` is empty while the homepage advertises
   We Want Miles across 9–11 Oct (§2). Add the three nights, seed, then check
   Programme → Website export against the live homepage.
4. **Three house drinks have a name and no spec**: Peachy Black Highball, Oolong Black Whisky
   Sour, The Part-Time Lover. Solomon is feeding specs in as he writes them — add them to
   `data/recipes.json` and re-run `seed:bar`.
5. **Three menu cocktails unaccounted for**: Golden Olive Sour, Golden Yuzu Negroni, Coffee After
   Dark are on acidity.com.au but absent from the spec sheets. Ask whether they are retired or
   the specs are still coming. (Acidity Letter was in this list and has since been restored with
   its spec, so the menu page is not automatically wrong.)
6. **Link the 12 house-pour ingredients** (§6) — needs Solomon to say which gin is "Gin".
7. **A daily "promote next event" routine** was agreed but never created: `create_trigger` failed
   three times with `MCP error -32003: MCP tool call requires approval` and no prompt ever
   appeared for the user. Unresolved.
8. **Automatic website publishing** (D4) — the export is still copy-and-paste. A build step that
   writes `index.html` / `events.html` is the natural next move once it has been trusted by hand.
9. **Move Acidic to a private repo** — see §8.

---

## 8. Things that will bite you

- **The repository is public.** Acidic's code is on a feature branch, not merged to `main`, partly
  for that reason. No secrets are committed (`deploy/.env` is ignored), but keep it in mind
  before merging or before putting anything identifying in `data/`. Moving `acidic/` to its own
  private repo is a `git subtree split`; nothing inside the folder assumes its location.
- **`.partial()` on a Zod schema keeps the parent's `.default()`s.** This shipped a real bug:
  `stockItemUpdateSchema` was derived with `.partial()`, so a request setting only `unitCost`
  arrived carrying `parLevel: 0` and `supplier: null` and would have wiped both. Update schemas
  are now written out explicitly. Check any new one the same way.
- **`grid-template-columns: 1fr` will not shrink below its content.** One wide table was pushing
  the whole workspace 180–270px wider than a 390px phone, on *every* screen. It is
  `minmax(0, 1fr)` now. Mobile is the primary platform here — always re-measure
  `documentElement.scrollWidth - clientWidth` after layout work.
- **Inputs must be ≥16px** or iOS zooms the page on focus. Controls are 44px minimum.
- **A form that unmounts on success eats its own confirmation.** The stocktake form did this —
  save, and the sheet vanished with no message, which reads as failure on a phone. The success
  message now lives outside the form.
- **The standalone Docker build needs `.next/static` and `public` copied into `.next/standalone`**
  or every page serves unstyled. The Dockerfile does this; don't remove it.
- **Don't use `pkill -f`** in this repo's workflows — it matches its own shell and exits 144. Use
  a different port instead of killing a dev server.
- **`npm run start` silently keeps serving the old build** if the port is already taken; the
  `EADDRINUSE` line scrolls past and you screenshot a stale app. Check the port first.

---

## 9. Where the decisions are

`ACIDIC_DECISIONS.md` is append-only, D1–D17. The ones most likely to be re-litigated:

- **D3** — no award interpretation. Roster cost is paid hours × base rate. Penalty rates,
  loadings and super are deliberately not computed; a wrong number that looks authoritative is
  worse than a plain one.
- **D5** — sales are not itemised in the stocktake. Usage is the difference between counts.
- **D6** — ledger entries are voided with a reason, never edited.
- **D13** — the programme is a file, not twenty trips through a form; the file ships empty
  because past events are not back-filled.
- **D15** — the stock list carries no costs, on purpose.
- **D16** — recipes are their own domain, linked to stock by name.
- **D17** — stock and recipes are edited on a phone.

---

## 10. Verified state as of this handover

- 74 unit tests, typecheck, lint, `db:check` and `build` all pass. CI green on `7e01f59`.
- Seeds exercised against a real PostgreSQL 16: dry run rolls back, `--apply` writes, a second
  run reports everything unchanged, a cost set by hand survives re-seeding, a cancelled event is
  not revived, a private booking is refused a date a public gig holds.
- The live app driven in a real browser at 390×844: signed in, edited a stock line's cost and
  par, recorded a delivery, ran a stocktake, edited a cocktail spec and linked an ingredient to a
  bottle — each confirmed in the database with its audit row, no horizontal overflow.
- **Not verified:** any of it against real business data. Every cost, rate and takings figure in
  the system is either zero or fictional.
