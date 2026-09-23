# Acidic status

**Last updated:** 22 September 2026, 10:05 AEST

## Verified in this checkout

- `npm test` - 57 unit tests pass (11 files); 4 PostgreSQL integration tests skip without a database.
- `npm run typecheck` - clean. `npm run lint` - clean, no warnings.
- `npm run db:generate` - two migrations, `drizzle/0000_short_rictor.sql` (10 tables) and
  `drizzle/0001_public_freak.sql` (email optional on a profile). `npm run db:check` clean.
- `npm run build` with `ACIDIC_STANDALONE=1` - production build, 23 routes.
- Standalone server started in preview: every screen 200, `/api/events` 503 (live disabled),
  stylesheet served, desktop and phone screenshots reviewed.
- `scripts/seed-programme.mjs` against a real PostgreSQL 16, using the 13-event worked example
  as a test programme: the dry run reports and rolls back, `--apply` writes 13 events with
  their audit entries, a second run reports all 13 unchanged, an edited row updates only the changed fields and records the status move, a
  cancelled event is not revived, a private hire is refused a date a public gig holds, and an
  invalid file is rejected naming the gig by date and title.
- The seeded database rendered through the website export reproduces `index.html`'s calendar
  `data-events` for 9 of 13 dates; the 4 differences are the hand-written site disagreeing with
  itself (see "Known gaps").
- A correctness review of the first commit found ten issues, all fixed and covered: screens
  now enforce the same role as their APIs (Money, Stock, Website export are manager-only;
  staff never see hourly rates), shift cost is computed from minutes not display-rounded
  hours, pasted website HTML is escaped, a malformed shift time is a 400 not a 503, all
  sums go through `sumMoney`, retired stock lines leave the reorder list, and `updateShift`
  checks the person is active.

## Not yet verified

- The four PostgreSQL integration tests against a real database (CI is configured to run
  them; it has not run yet because the workflow lands with this commit).
- The Docker image build and the compose stacks: `docker compose … config` validates locally
  with the live overlay and both profiles, but this sandbox has no Docker daemon, so the
  build, migration and live-start checks run in CI's `containers` job (not run yet - the
  workflow lands with this commit).
- Post-deploy smoke (`scripts/smoke-live.mjs`) passes against the standalone build in
  preview mode; the forms are correctly absent in preview.
- Live sign-in, the live services and the audit log on your own installation.
- Any real business data. The fixtures are illustrative; unit costs, rates and takings are
  invented, and only the August 2026 programme dates and titles are real.

## Known gaps

- Entry forms exist for events, stock counts, shifts and ledger entries (live mode; managers).
  Stock deliveries/waste, new stock lines, new staff, event edits and voids are API-only from
  the browser for now - the form pattern is `src/components/event-form.tsx`.
- No staff self-service beyond reading the roster.
- Website export is copy-and-paste (D4).
- The site's hand-written calendar is not internally consistent, so pasting a fresh export will
  tidy four entries: 10 Aug gains its "Two Trumpets" genre, 14 Aug's one-off "Details TBC"
  becomes "Details TBA", 21 Aug drops "Details TBA" from inside the title, and 23 Aug reads
  "J-Fusion & Hiphop - Chakamens" like every other row rather than artist-first. Intended, but
  check them before pasting.
- **`data/programme.json` is empty and the website has no upcoming event.** acidity.com.au's
  last listed date is 29 August, so the hero, the Upcoming lists and the calendar are all
  showing a programme that has finished. October's dates are the blocker for everything the
  programme feeds; nothing before them is worth entering.

## Next priorities

1. Run the setup guide on the bar's machine; accept the live flow with fictional data.
2. Entry forms for the four domains (the API contracts are the Zod schemas in each `lib/*`).
3. A build step that writes the website export into `index.html` / `events.html`, replacing
   the hand-editing and the daily "promote next event" routine.
4. Put October onwards in `data/programme.json` and seed it - the site has nothing upcoming.
5. Enter real stock lines and staff; import the bookkeeper's opening figures for the quarter.
