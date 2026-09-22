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

**D10 - 22 Sept 2026 - Minimal footprint on the shared laptop.** Solomon: "keep acidic as min
as possible so that it's less disruptive to other services." The live stack is three
containers - app (512 MB, 1 CPU), db (384 MB, 1 CPU, PostgreSQL tuned small) and the backup
loop (128 MB, 0.25 CPU) - with hard limits so Acidic can never crowd Monnie; the tools
container runs only on demand. Caddy was removed: HTTPS comes from the tunnel, so it was an
unused service, an image and a CI step. No worker, no AI, no mail integration.
