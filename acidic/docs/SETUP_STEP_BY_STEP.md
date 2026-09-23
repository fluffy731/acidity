# Acidic live setup, step by step

This is the same path Monnie runs on: Docker on the always-on Windows desktop, PostgreSQL in a
private container, the app in a container, nightly backups, and the existing Cloudflare Tunnel
for HTTPS so the bar's phones can reach it. Follow it in order. Every command is run from the
`acidic` folder unless it says otherwise. Nothing here needs a Neon/Vercel account.

Expect about an hour the first time. Steps 1-4 are one-off; step 12 is how you deploy forever after.

---

## 0. Before you start - what you need

- A Windows PC (or Mac/Linux box) that stays on and awake while the bar trades. Monnie runs on
  the always-on Windows desktop with Docker Desktop; the same machine serves both.
- **Docker Desktop** installed and running (https://www.docker.com/products/docker-desktop/).
- **Git** and **Node.js 22** (https://nodejs.org, the LTS line) for the one-off commands.
- A folder that is synced off the machine for backups - OneDrive, Google Drive or an external
  disk. Example: `C:\Users\<you>\OneDrive\Acidity\Acidic Backups`.
- A hostname for the app. Decision D9: **`acidic.lingenious.com.au`**, on the existing Monnie
  Cloudflare tunnel, because `lingenious.com.au` is already on Cloudflare and this is a
  staff-only tool. No DNS change to `acidity.com.au` and no new Cloudflare account.

## 1. Get the code onto the machine

```powershell
cd F:\Development
git clone https://github.com/fluffy731/acidity
cd acidity
git checkout claude/programme-content-update-flpkoy   # until Acidic is merged or moved to its own repo
cd acidic
npm ci
```

Sanity check it works on this machine before touching Docker:

```powershell
npm test
npm run typecheck
npm run build
```

All three must pass. If `npm test` fails, stop and fix that first - nothing below will help.

## 2. Try the preview (no database, no accounts)

```powershell
npm run dev
```

Open http://localhost:3000 → **Open preview**. Click around Today, Programme → Website export,
Stock, Roster, Money. This is fictional data seeded with the August programme. Press Ctrl+C
when done. You now know what the live app will look like.

## 3. Create the secrets file

The live stack reads one file, `acidic/deploy/.env`, which is git-ignored. Create it:

```powershell
New-Item deploy\.env -ItemType File
notepad deploy\.env
```

Paste this in and fill every line (no quotes, no spaces around `=`):

```
ACIDIC_DOMAIN=acidic.lingenious.com.au
POSTGRES_PASSWORD=<paste output of: openssl rand -hex 32>
AUTH_SECRET=<paste a DIFFERENT output of: openssl rand -hex 32>
ACIDIC_BACKUP_DIR=C:\Users\<you>\OneDrive\Acidity\Acidic Backups
ACIDIC_LEGAL_NAME=<the trading entity's legal name>
ACIDIC_ABN=<the ABN>
ACIDIC_BUSINESS_ADDRESS=3/240 Victoria Street, Richmond VIC 3121
ACIDIC_BUSINESS_EMAIL=admin@acidity.com.au
```

To generate the two secrets, in PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it twice - one value for `POSTGRES_PASSWORD`, another for `AUTH_SECRET`. Never reuse them,
never commit this file, never paste it into a chat. Create the backup folder now so Docker can
mount it:

```powershell
New-Item "C:\Users\<you>\OneDrive\Acidity\Acidic Backups" -ItemType Directory -Force
```

## 4. Build the images and start the database

```powershell
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml build
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml up -d --wait db
```

The first build downloads Node and PostgreSQL images and takes a few minutes. `up -d --wait db`
starts only the database and waits until it reports healthy.

## 5. Apply the migrations

The `tools` image runs the reviewed SQL in `drizzle/` against the private database:

```powershell
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml --profile tools run --rm tools
```

You should see the migrations applied (`0000_short_rictor` creates the tables,
`0001_public_freak` makes email optional on profiles). This is safe to run again later: it
only applies migrations that have not been applied yet. Every future schema change is a new
file in `drizzle/` and this same command.

## 6. Create the sign-in profiles

Sign-in is "tap your profile, type a 6-digit passcode" (decision D12). Create one profile per
person or shared role, through the tools container so the passcode is hashed inside the
network and never written to disk. Owner first:

```powershell
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml --profile tools run --rm -it tools node scripts/create-profile.mjs --role owner
```

Enter the tile name (`Solomon`) and a 6-digit passcode, typed twice, hidden. Then the managers:

```powershell
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml --profile tools run --rm -it tools node scripts/create-profile.mjs --role manager
```

Run it once per manager profile (`Manager 1`, `Manager 2`, or real names). `--role staff`
makes a read-only roster profile. Running the command again with an existing name resets that
profile's passcode and clears its lockout - that is how a forgotten passcode is fixed.
There is no default profile and no public registration. Five wrong passcodes lock a profile
for 15 minutes, which is what protects a six-digit code on a public address.

## 7. Make it reachable over HTTPS

Live mode refuses to run over plain http except on localhost. Acidic rides the Cloudflare
tunnel Monnie already uses - one tunnel serves any number of hostnames:

1. Cloudflare dashboard → Zero Trust → Networks → Tunnels → open the existing Monnie tunnel
   (the one whose public hostname is `app.lingenious.com.au`).
2. **Public Hostname** tab → **Add a public hostname**: subdomain `acidic`, domain
   `lingenious.com.au`, service type HTTP, URL `host.docker.internal:3100`. Save. Cloudflare
   creates the DNS record itself.
3. Nothing changes for Monnie: its hostname still points at port 3000, Acidic's at 3100, and
   the `cloudflared` connector container already running on the desktop picks up the new
   route within a minute. No new tunnel, connector, token or Cloudflare account.

If you ever want `acidic.acidity.com.au` instead, `acidity.com.au`'s DNS has to move to
Cloudflare first (free), which touches the live website's domain - do that as its own job.
`ACIDIC_DOMAIN` in `deploy/.env` must be exactly the hostname people will type.

## 8. Start the app

```powershell
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml up -d --build --wait app backup
```

Then check:

```powershell
node scripts/smoke-live.mjs
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml ps
docker stats --no-stream
```

Smoke should print `SMOKE OK`, and `docker stats` should show the three Acidic containers
well inside their caps (app 512 MB, db 384 MB, backup 128 MB - see "Footprint" below).
Open `https://acidic.lingenious.com.au` on your phone: you should
see **Sign in to Acidic**, not the preview. Sign in with the owner account. Today will be
empty - that is correct; there are no records yet.

## 9. Load the programme

The bar's programme lives in one editable file, `data/programme.json`, and is loaded with a
command rather than typed into the app one gig at a time. Each event is one object; only the
date and title are required. The file opens with a note listing every field, and
`data/programme.example.json` next to it is a worked example of every status to copy from.

The file ships empty - put the coming season's dates in it first. Past events are not worth
back-filling: the programme is there to drive the website's hero, the Upcoming lists and the
roster, and none of those care what happened last month.

Look at what it would do first:

```powershell
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml --profile tools run --rm tools node scripts/seed-programme.mjs
```

That reports what it would create or change and then rolls the whole thing back - nothing is
written. When the list reads right, keep it:

```powershell
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml --profile tools run --rm tools node scripts/seed-programme.mjs --apply
```

Things worth knowing:

- An event is identified by its **date and title**, so re-running after an edit updates that
  event rather than making a second one. Run it as often as you like.
- Nothing is ever deleted. An event removed from the file stays in the database, because the
  programme is the record of what was on - cancel it in the app instead.
- An event you cancelled in the app is never revived by the file, and a private hire is never
  written onto a date a public gig already holds. Both are reported as `SKIPPED`.
- `data/` is mounted into the tools container, so editing the file on the desktop takes effect
  on the next run with no rebuild.
- After editing, `npm run test` checks the file against the app's own event rules - a ticketed
  night with no booking link, a private booking left public, a date typed wrong. CI does this
  too, and names the offending gig by date and title.

Then open Programme in the app, and Programme -> **Website export** to render the site blocks
from what you just loaded.

## 10. Load the stock list and the recipe book

`data/stock.json` is the bar's countable lines - the back bar as the menu lists it, the
liqueurs and bitters the cocktail specs need, kegs, wine, sake, mixers, produce and dairy.
`data/recipes.json` is the cocktail list: the house specs and the classics. Load both:

```powershell
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml --profile tools run --rm tools node scripts/seed-bar.mjs
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml --profile tools run --rm tools node scripts/seed-bar.mjs --apply
```

The first reports and rolls back; the second keeps it. It links each ingredient to the bottle
it pours from wherever the names match, and lists the ones still to decide - "Gin" has to be
told which gin.

**Every cost and par level is zero**, on purpose: a guessed cost would quietly corrupt stock
value, the reorder list and the P&L. Set them on the **Stock** screen, which is built for a
phone: search a line, tap **Edit**, type the cost and the par. Re-running the seed never
overwrites a cost or par you have set.

Day to day on the Stock screen: **Start a stocktake** walks the bar section by section with a
running count; **+ Delivery** and **− Waste** on any line record a movement in two taps.
Cocktails is on the main nav - anyone on shift can read a spec, managers can edit one.

## 11. Acceptance run (do this once, with fictional data, before real records)

Signed in as the owner, using the entry forms on each screen:

1. Programme → Add an event as a placeholder; then (via `PATCH /api/events/<id>` for now)
   move it to `confirmed`, then `ticketed` with a booking link. Check it appears on
   Programme and in the Website export.
2. Stock → add two items (`POST /api/stock/items`), then Record a stocktake twice a week
   apart with a delivery between them (`POST /api/stock/movements`); check Stock shows usage
   and the reorder list.
3. Roster → add a staff member (`POST /api/staff`), then Add a shift on the event's date;
   check Today's coverage.
4. Money → Record takings and a stock purchase; check the P&L and BAS.
5. `POST /api/ledger/<id>/void` with a reason; the entry shows struck through.
6. Sign out, pick a profile and enter a wrong passcode five times: that profile locks for 15
   minutes (reset it early with the profile command if needed).

Then reset before real records: from **this `acidic` folder, with this `--env-file`**,
`docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml down --volumes`,
and repeat steps 4-6, then steps 9 and 10. Never run `down --volumes` from Monnie's folder: it would delete
Monnie's database volume.

## 12. Day-to-day

- **Deploy a change:** `git pull`, then the step-8 `up -d --build --wait` command, then
  `node scripts/smoke-live.mjs`. If smoke fails, `docker compose … logs --tail 60 app`.
- **New migration in the pull:** run step 5 before step 8.
- **A gig changes:** edit `data/programme.json`, run step 9 (dry run, then `--apply`).
- **A new bottle or a new drink:** add it on the Stock or Cocktails screen, or edit
  `data/stock.json` / `data/recipes.json` and re-run step 10.
- **Backups:** the `backup` container writes `acidic-<stamp>.dump` into `ACIDIC_BACKUP_DIR`
  every ~20 hours and keeps 30. Confirm a file appears there in the first day; that folder
  syncing off the machine is your disaster recovery.
- **Restore:** `pg_restore -d acidic --clean <file>` inside a `postgres:17` container attached
  to the compose network. Practise once on a throwaway stack.
- **Readiness check:** `node --env-file=deploy/.env scripts/readiness.mjs` reports what is
  configured for live mode.
- **Reboot:** every container has `restart: unless-stopped`; Docker Desktop must be set to start
  at login and the PC must not sleep while the bar trades.

## 13. Keep it in step with the website

Programme → **Website export** renders the Programme Index rows, the Upcoming lists, the
calendar `data-events` attribute and the hero event from the live programme. Paste them into
`index.html` / `events.html` in the website repository and push - the same edits made by hand
in August, now generated. When that has been done by hand a few times and trusted, the next
step (ACIDIC_STATUS.md) is a build step that writes them automatically.

## Footprint - keeping Acidic out of Monnie's way

Acidic is deliberately small on the shared desktop (decision D10):

- Three containers when live: `acidic-app-1` (capped at 512 MB, 1 CPU), `acidic-db-1`
  (384 MB, 1 CPU, PostgreSQL configured for a small database) and `acidic-backup-1`
  (128 MB, 0.25 CPU, asleep between backups). The `tools` container exists only while a
  migration or account command runs. Total steady state is well under 1 GB of RAM and idle CPU.
- No reverse proxy, worker, AI or mail service. HTTPS is the tunnel's job.
- Its own Compose project (`acidic`), network, volume and images: it cannot reach Monnie's
  database or containers, and Monnie cannot reach it.
- Disk: about 2-3 GB of images and build cache. After each deploy run
  `docker image prune -f` and `docker builder prune -f --filter until=72h`, the same habit
  Monnie's deploy script has, and check F: has room before building.
- Docker Desktop restarts pause both apps together; nothing else is shared.

## Differences from Monnie, on purpose

- Port 3100 on the host (Monnie is 3000) so both run on one machine.
- No OneDrive document mount, no OpenAI key, no Zoho mail: a bar's records are the four
  tables, not documents and email.
- Roles are owner / manager / staff, not Director / team.
- Backup folder is `ACIDIC_BACKUP_DIR` in `deploy/.env`, kept separate from the Lingenious
  business OneDrive.
- No Caddy: Acidic shares Monnie's Cloudflare tunnel instead of carrying its own proxy.
