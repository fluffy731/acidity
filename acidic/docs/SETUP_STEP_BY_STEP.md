# Acidic live setup, step by step

This is the same path Monnie runs on: Docker on the always-on Windows desktop, PostgreSQL in a
private container, the app in a container, nightly backups, and the existing Cloudflare Tunnel
for HTTPS so the bar's phones can reach it. Follow it in order. Every command is run from the
`acidic` folder unless it says otherwise. Nothing here needs a Neon/Vercel account.

Expect about an hour the first time. Steps 1-4 are one-off; step 9 is how you deploy forever after.

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

You should see the migration `0000_short_rictor` applied. This is safe to run again later: it
only applies migrations that have not been applied yet. Every future schema change is a new
file in `drizzle/` and this same command.

## 6. Create your owner account

Interactive, in your own terminal, through the tools container (so the password is hashed
inside the network and never written to disk):

```powershell
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml --profile tools run --rm -it tools node scripts/create-owner.mjs
```

Enter your name, email and a password of at least 14 characters (typed twice, hidden). To add a
manager or staff sign-in later, append `--role manager` or `--role staff` to that command.
There is no default account and no public registration.

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

## 9. Acceptance run (do this once, with fictional data, before real records)

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
6. Sign out, sign in with a wrong password five times: the account locks for 15 minutes.

Then reset before real records: from **this `acidic` folder, with this `--env-file`**,
`docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml down --volumes`,
and repeat steps 4-6. Never run `down --volumes` from Monnie's folder: it would delete
Monnie's database volume.

## 10. Day-to-day

- **Deploy a change:** `git pull`, then the step-8 `up -d --build --wait` command, then
  `node scripts/smoke-live.mjs`. If smoke fails, `docker compose … logs --tail 60 app`.
- **New migration in the pull:** run step 5 before step 8.
- **Backups:** the `backup` container writes `acidic-<stamp>.dump` into `ACIDIC_BACKUP_DIR`
  every ~20 hours and keeps 30. Confirm a file appears there in the first day; that folder
  syncing off the machine is your disaster recovery.
- **Restore:** `pg_restore -d acidic --clean <file>` inside a `postgres:17` container attached
  to the compose network. Practise once on a throwaway stack.
- **Readiness check:** `node --env-file=deploy/.env scripts/readiness.mjs` reports what is
  configured for live mode.
- **Reboot:** every container has `restart: unless-stopped`; Docker Desktop must be set to start
  at login and the PC must not sleep while the bar trades.

## 11. Keep it in step with the website

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
