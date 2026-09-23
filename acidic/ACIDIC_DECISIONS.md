# Acidic decisions

Append-only. Newest last.

**D1 - 21 Sept 2026 - Reuse Monnie's framework, not its domain.** Acidic takes from
Monnie the things that made it safe to run a business on: preview/live modes, integer-cents
money with one GST method, strict schemas at every boundary, transactional services with an
audit log, Docker + PostgreSQL + Caddy self-hosting, CI that migrates a real database, and the
five maintained records. It takes none of the consulting workflow (enquiries, proposals,
invoices, drawings). A bar has different records: events, stock, shifts, takings.

**D2 - 21 Sept 2026 - Acidic lives in `acidity/acidic/`.** The website repository is the only
one this session could push to, and the two are coupled by the website export anyway. CI is
path-filtered so website-only commits do not build the app. Moving to its own repository later
is a `git subtree split`; nothing inside the folder assumes its location.

**D3 - 21 Sept 2026 - No award interpretation.** Roster cost is paid hours × base hourly rate.
Penalty rates, casual loading, overtime and superannuation are not computed, because the
Hospitality Award rules change and a wrong number that looks authoritative is worse than a
base figure clearly labelled as such. Payroll stays with the payroll system; Acidic records
the wages paid as a ledger entry.

**D4 - 21 Sept 2026 - The website export is copy-and-paste for now.** It renders the exact
blocks index.html and events.html carry today, and tests assert those strings. Automatic
publishing (a build step or the daily routine writing the files) is the obvious next step
once the export has been used by hand a few times and trusted.

**D5 - 21 Sept 2026 - Sales are not itemised in the stocktake.** Usage is the difference
between counts after deliveries and waste. This is how a small bar actually counts; a per-item
sales feed would need POS integration, which is out of scope.

**D6 - 21 Sept 2026 - Ledger entries are voided, never edited.** Same rule as Monnie's
invoices: a mistake becomes a void with a reason plus a fresh entry, so the ledger always
explains itself to the bookkeeper.

**D7 - 21 Sept 2026 - BAS figures are working figures.** G1/G11/1A/1B/W1 on a cash basis, for
the bookkeeper to lodge from, with GST-free items marked by the person entering them. Acidic
does not decide taxability and does not calculate PAYG withholding.

**D8 - 21 Sept 2026 - The preview is read-only and seeded with real programme dates.** Unlike
Monnie's editable localStorage preview, Acidic's preview is a fixed fixture workspace opened
on 10 August 2026. It exists to show the screens and to test the website export against the
live site; editing belongs in live mode with a real database.

**D9 - 22 Sept 2026 - Hostname is `acidic.lingenious.com.au` on the existing Monnie tunnel.**
`lingenious.com.au` is already on Cloudflare; `acidity.com.au`'s DNS is not, and moving it
would touch the live website's domain for the sake of an address only staff will type. One
tunnel serves both apps by hostname. Revisit only if a customer-facing address is ever needed.

**D10 - 22 Sept 2026 - Minimal footprint on the shared desktop.** Solomon: "keep acidic as min
as possible so that it's less disruptive to other services." The live stack is three
containers - app (512 MB, 1 CPU), db (384 MB, 1 CPU, PostgreSQL tuned small) and the backup
loop (128 MB, 0.25 CPU) - with hard limits so Acidic can never crowd Monnie; the tools
container runs only on demand. Caddy was removed: HTTPS comes from the tunnel, so it was an
unused service, an image and a CI step. No worker, no AI, no mail integration.

**D11 - 22 Sept 2026 - Passwords are at least 6 characters, not 14.** Solomon: "we don't need
such a strong security for acidic - just something simple like 6 characters." Accepted for a
staff tool. What actually defends the public sign-in page is the five-failure, 15-minute
lockout in `src/lib/auth/policy.ts`, which is unchanged; bcrypt cost 12 also stands.

**D12 - 22 Sept 2026 - Sign-in is a profile tile plus a 6-digit passcode.** Solomon: "select a
profile to sign in as Manager… then just passcode to sign in 6 digits. make it simple." Replaces
email + password (and supersedes D11). Profiles (Solomon as owner, `Manager 1`, `Manager 2`,
…) are created and reset from the server; email is now optional on a profile, since a shared
manager tile has none. Names appear on the public sign-in page - keep them to first names or
role labels. The five-failure, 15-minute lockout is what makes a one-in-a-million code safe
enough for a staff tool; passcodes are still bcrypt-hashed (cost 12) and never stored plain.

**D13 - 22 Sept 2026 - The programme is loaded from a file, not typed in one gig at a time.**
`data/programme.json` holds the bar's events and `npm run programme:seed` applies it, keyed on
date and title so it can be run repeatedly. A season's dates are a list someone edits in one
sitting, not twenty trips through a form, and the file is reviewable in a pull request. The app's
own event rules are the authority: `tests/programme-seed.test.ts` parses the file with
`eventInputSchema` in CI, so a ticketed night with no booking link fails on a laptop rather than
at the bar. The seed never deletes: an event dropped from the file stays in the database, and one
cancelled in the app is not revived by re-running. The entry form remains for the single gig
added on a Tuesday. The file ships empty: past events are not back-filled, because the programme
exists to drive the hero, the Upcoming lists and the roster, and none of those look backwards.
`data/programme.example.json` keeps a worked example of every status to copy from.

**D14 - 22 Sept 2026 - The calendar shows a session's finish when one is published.** The
booking calendar on index.html reads "2pm - 10pm" for the Sunday day programme and "3pm - 8pm"
for the 9 August private hire, but `ProgrammeEvent` had no end time, so the export rendered only
"2pm" and "3pm" - it would have thrown away the window of the private hire the calendar exists to
block out. `endTime` is now optional on `ProgrammeEvent`, read from the database by
`loadWorkspace`, and rendered as an en-dashed range. `tests/website-export.test.ts` changed with
it, as the export rule in CLAUDE.md requires.

Four calendar entries still differ from the live site, and deliberately: the site's hand-written
`data-events` follows a different convention on each of them (10 Aug omits its genre, 14 Aug says
"Details TBC" where every other row says "Details TBA", 21 Aug puts "Details TBA" inside the
title, 23 Aug leads with the artist). The export applies one convention to all rows, so pasting a
fresh export tidies those four. The export is the format from here.

**D15 - 23 Sept 2026 - The stock list is seeded from the menu, with no costs.** `data/stock.json`
holds 148 lines built from what acidity.com.au actually sells - the back bar spirit by spirit,
the six kegs, the wine and sake lists, the printed mixers - plus every liqueur, bitter, syrup and
piece of produce the cocktail specs call for. Unit cost and par level are **zero on every line**.
A plausible-looking guessed cost is worse than an obvious gap: it would flow into stock value,
the reorder list and cost of goods, and nobody would know the figures were invented. Re-running
the seed never overwrites a cost or par that has been set, so the file stays usable as the list
grows.

**D16 - 23 Sept 2026 - Recipes are their own domain, linked to stock by name.** A recipe is what
the bar makes, a stock line is what it buys, and one bottle serves many drinks, so
`recipes` / `recipe_lines` sit beside stock rather than inside it. Every measure carries its
ingredient as written text and, optionally, the stock line it draws from; the seed links the two
when the names match exactly, which covers 134 of 165 measures and leaves the house-pour
decisions ("which gin is Gin") to a person. That link is what lets a stocktake say a drink is
about to become unmakeable. Specs came from the bar's own sheets, so they supersede the
ingredient prose on the menu page; three drinks are recorded with no measures rather than
invented, and the classics were added so the back bar is checked against everything the bar
actually pours.

**D17 - 23 Sept 2026 - Stock and recipes are edited on a phone, not a laptop.** Solomon: "make
it mobile friendly as that's most frequently used platform." Both screens are card lists with
44px controls and 16px inputs (smaller text makes iOS zoom the page): search a line, tap Edit,
change the cost. A stocktake collapses by category with a running count, and holds entered
quantities in component state so searching never loses them. Fixing this exposed a layout bug
affecting every screen - `grid-template-columns: 1fr` will not shrink below its content, so one
wide table pushed the whole workspace ~180-270px wider than the phone; it is now
`minmax(0, 1fr)`.

