# Acidic live setup, step by step

This is the same path Monnie runs on: Docker on a machine that stays on, PostgreSQL in a
private container, the app in a container, nightly backups, and a Cloudflare Tunnel (or Caddy)
for HTTPS so the bar's phones can reach it. Follow it in order. Every command is run from the
`acidic` folder unless it says otherwise. Nothing here needs a Neon/Vercel account.

Expect about an hour the first time. Steps 1-4 are one-off; step 9 is how you deploy forever after.

---

## 0. Before you start - what you need

- A Windows PC (or Mac/Linux box) that stays on and awake while the bar trades. Monnie runs on
  the office laptop with Docker Desktop; the same works here.
- **Docker Desktop** installed and running (https://www.docker.com/products/docker-desktop/).
- **Git** and **Node.js 22** (https://nodejs.org, the LTS line) for the one-off commands.
- A folder that is synced off the machine for backups - OneDrive, Google Drive or an external
  disk. Example: `C:\Users\<you>\OneDrive\Acidity\Acidic Backups`.
- A domain or subdomain you control, e.g. `acidic.acidity.com.au` (you own `acidity.com.au`
  already - the DNS lives wherever the website's `CNAME` points). Needed only for step 7.

## 1. Get the code onto the machine

```powershell
cd C:\Development            # or wherever you keep projects
git clone https://github.com/fluffy731/acidity
cd acidity\acidic
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
ACIDIC_DOMAIN=acidic.acidity.com.au
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

Live mode refuses to run over plain http except on localhost, so pick one:

**Option A - Cloudflare Tunnel (what Monnie uses; no ports opened on the router).**

1. In the Cloudflare dashboard for `acidity.com.au` → Zero Trust → Networks → Tunnels →
   Create a tunnel. Choose the Docker connector. Cloudflare shows a `docker run … cloudflared
   tunnel run --token …` command.
2. Run it, adding a restart policy so it survives reboots:
   `docker run -d --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <token>`
3. In the tunnel's **Public Hostname** tab add `acidic.acidity.com.au` → service
   `http://host.docker.internal:3100`. Cloudflare creates the DNS record for you.

**Option B - Caddy on this machine (needs ports 80/443 forwarded on the router and an A
record for `acidic.acidity.com.au` pointing at your public IP).** Start the stack with
`--profile https` in step 8 and Caddy obtains the certificate itself.

Either way `ACIDIC_DOMAIN` in `deploy/.env` must be exactly the hostname people will type.

## 8. Start the app

```powershell
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml up -d --build --wait app backup
```

(add `--profile https caddy` at the end for option B). Then check:

```powershell
node scripts/smoke-live.mjs
docker compose --env-file deploy/.env -f compose.yaml -f compose.live.yaml ps
```

Smoke should print `SMOKE OK`. Open `https://acidic.acidity.com.au` on your phone: you should
see **Sign in to Acidic**, not the preview. Sign in with the owner account. Today will be
empty - that is correct; there are no records yet.

## 9. Acceptance run (do this once, with fictional data, before real records)

Using the API from the browser console, or a REST client, while signed in:

1. `POST /api/events` with a placeholder event, then `PATCH` it to `confirmed`, then to
   `ticketed` with a booking link. Check it appears on Programme and in the Website export.
2. `POST /api/stock/items` for two items, `POST /api/stock/counts` twice a week apart with a
   delivery between them; check Stock shows usage and the reorder list.
3. `POST /api/staff`, then `POST /api/shifts` on the event's date; check Today's coverage.
4. `POST /api/ledger` for takings and a stock purchase; check Money's P&L and BAS.
5. `POST /api/ledger/<id>/void` with a reason; the entry shows struck through.
6. Sign out, sign in with a wrong password five times: the account locks for 15 minutes.

Then delete the fictional rows (or simply reset: `down --volumes` and repeat steps 4-6).
Entry forms for these actions are the next build; the APIs are the contract.

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

## Differences from Monnie, on purpose

- Port 3100 on the host (Monnie is 3000) so both can run on one machine.
- No OneDrive document mount, no OpenAI key, no Zoho mail: a bar's records are the four
  tables, not documents and email.
- Roles are owner / manager / staff, not Director / team.
- Backup folder is `ACIDIC_BACKUP_DIR` in `deploy/.env` rather than a fixed OneDrive path.
