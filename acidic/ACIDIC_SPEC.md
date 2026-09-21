# Acidic specification

**Last updated:** 21 September 2026
**Status:** V1 scope, implemented as a preview and a live workflow awaiting acceptance

## Purpose

Acidity Bar & Coffee runs a coffee bar by day and a live-music bar by night on Victoria Street,
Richmond. Four things are currently kept in separate places (a hand-edited website, a notebook
behind the bar, a roster message thread and a bookkeeper's spreadsheet). Acidic keeps them in
one record and shows the owner what needs doing today.

## Roles

- **Owner** - everything, including voiding money.
- **Manager** - programme, stock, roster and ledger entries.
- **Staff** - reads the roster and the programme.

Accounts are created from the server (`npm run owner:create`); there is no public registration.

## Programme

- An event has a date, title, optional artist and genre, a kind (`night_session`,
  `day_programme`, `private_booking`), a status (`placeholder`, `confirmed`, `ticketed`,
  `free_rsvp`, `private`, `cancelled`), optional start/end times, booking link, price range,
  description and the number of bar staff the night needs.
- Status moves: placeholder → confirmed → ticketed or free_rsvp (and back to confirmed);
  anything → cancelled; cancelled never revives. A private booking is always `private`.
- A booking link exists only on a ticketed or free-RSVP event, and such an event must have one.
  Enforced in the schema, the database and the website export.
- Every non-cancelled event occupies its date. Two public events on a date is a warning; a
  private booking alongside a public event is refused.
- **Website export** renders, from the programme: the Programme Index rows (date / title /
  ARTIST / GENRE / TIME / STATUS / action), the Upcoming lists, the booking calendar's
  `data-events` attribute, and the hero event (next public event on or after today) - in the
  formats agreed for acidity.com.au in September 2026. Private bookings are never listed
  publicly; on the calendar they appear as venue-unavailable.

## Stocktake

- Stock items have a category, unit, GST-inclusive unit cost, par level and supplier.
- A count records the quantity of each item on a date. Sales are never entered per item.
- Movements between counts: deliveries (in), waste and adjustments (out); quantity > 0.
- Usage = opening + deliveries − waste − adjustments − closing. Negative usage is shown, not
  hidden: it means a miscount or an unrecorded delivery.
- Stock value = Σ quantity × unit cost, in cents. Reorder list = everything below par, with the
  quantity and cost to return to par, most expensive gap first.

## Staffing

- Staff members have a default role, employment type and base hourly rate.
- A shift has a date, HH:MM start and end (24:00 allowed as an end), role, status
  (`rostered`, `confirmed`, `worked`, `no_show`, `cancelled`) and unpaid break minutes.
- Paid hours = shift length − break. Cost = paid hours × base rate, in cents. No penalty rates,
  loadings or superannuation are computed (D3).
- Overlapping shifts for one person on one date are refused.
- Coverage compares the people rostered on an event's date with the event's `staffRequired`;
  a shortfall is the first thing Today shows.

## Money

- One ledger of `income`, `expense` and `wages` entries with a category, GST-inclusive total,
  computed GST and subtotal, GST-free flag, payment method, optional event and reference.
- The split is computed once (`ledgerSplit`) and stored; the database checks
  subtotal + gst = total and that GST-free entries carry zero GST.
- Entries are voided with a reason, never edited or deleted.
- P&L (cash basis, ex GST) for any period: income, cost of goods (stock purchases), wages,
  other expenses, gross and net profit, by category.
- BAS working figures for the quarter containing a date: G1, G11, 1A, 1B, net GST, W1.
- Daily takings by date, for till reconciliation.

## Today

Joins the four: this week's events with roster coverage, roster hours and cost, stock on hand
and below-par lines, takings for the last seven days, month-to-date P&L, the current BAS
quarter, and a prioritised attention list (urgent / soon / note).

## Modes

- `ACIDIC_MODE=preview` (default): fictional workspace seeded with the August 2026 programme,
  no sign-in, nothing saved. Never a business record.
- `ACIDIC_MODE=live`: sign-in, PostgreSQL, audit log. Refuses to run unless a database, a
  32+ character `AUTH_SECRET` and one exact HTTPS origin (`APP_URL` = `AUTH_URL`) are set.

## Out of scope for V1

Till/POS integration, ticket-platform sync, payroll and award interpretation, PAYG withholding,
bank feed import, supplier ordering, automatic publishing to the website (the export is
copy-and-paste; a build step is the natural next move).
