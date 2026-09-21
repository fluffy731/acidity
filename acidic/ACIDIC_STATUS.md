# Acidic status

**Last updated:** 21 September 2026, 16:20 AEST

## Verified in this checkout

- `npm test` - 50 unit tests pass (10 files); 4 PostgreSQL integration tests skip without a database.
- `npm run typecheck` - clean. `npm run lint` - clean, no warnings.
- `npm run db:generate` - one migration, `drizzle/0000_short_rictor.sql`, 10 tables.
- `npm run build` with `ACIDIC_STANDALONE=1` - production build, 23 routes.
- Standalone server started in preview: every screen 200, `/api/events` 503 (live disabled),
  stylesheet served, desktop and phone screenshots reviewed.
- A correctness review of the first commit found ten issues, all fixed and covered: screens
  now enforce the same role as their APIs (Money, Stock, Website export are manager-only;
  staff never see hourly rates), shift cost is computed from minutes not display-rounded
  hours, pasted website HTML is escaped, a malformed shift time is a 400 not a 503, all
  sums go through `sumMoney`, retired stock lines leave the reorder list, and `updateShift`
  checks the person is active.

## Not yet verified

- The four PostgreSQL integration tests against a real database (CI is configured to run
  them; it has not run yet because the workflow lands with this commit).
- The Docker image build and the compose stacks (CI's `containers` job; not run here).
- Live sign-in, the live services and the audit log on your own installation.
- Any real business data. The fixtures are illustrative; unit costs, rates and takings are
  invented, and only the August 2026 programme dates and titles are real.

## Known gaps

- Entry forms exist for events, stock counts, shifts and ledger entries (live mode; managers).
  Stock deliveries/waste, new stock lines, new staff, event edits and voids are API-only from
  the browser for now - the form pattern is `src/components/event-form.tsx`.
- No staff self-service beyond reading the roster.
- Website export is copy-and-paste (D4).

## Next priorities

1. Run the setup guide on the bar's machine; accept the live flow with fictional data.
2. Entry forms for the four domains (the API contracts are the Zod schemas in each `lib/*`).
3. A build step that writes the website export into `index.html` / `events.html`, replacing
   the hand-editing and the daily "promote next event" routine.
4. Enter real stock lines, staff and September's programme; import the bookkeeper's opening
   figures for the quarter.
