# Board

Personal job board — synced listings, status triage, and markdown notes.

## Stack

- **Next.js** — responsive web app (Jobs + Pages)
- **Neon Postgres** — persistent storage
- **Vercel Cron** — daily board + company sync (automatic on deploy)

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000 — works with **in-memory demo data** when `DATABASE_URL` is not set.

## 1. Neon database

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy the connection string
3. Create `.env` from the example:

```bash
cp .env.example .env
# paste DATABASE_URL into .env
```

4. Push the schema:

```bash
npm run db:push
```

5. Optional — load demo seed data:

```bash
npm run db:seed
```

The app automatically uses Neon when `DATABASE_URL` is set.

## 2. Vercel deploy

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variable: `DATABASE_URL` (same Neon connection string)
4. Deploy

That's it — **sync runs automatically every day** after deploy. Vercel Cron hits two endpoints defined in `vercel.json`:

| Cron | Schedule (UTC) | What it syncs |
|------|----------------|---------------|
| `/api/cron/sync-all` | 06:00 | All job boards + company career pages |
| `/api/cron/sync-all` | 13:00 | All job boards + company career pages (afternoon) |

Board sync includes No Fluff Jobs, Just Join IT, Bulldogjob, We Work Remotely, Jobicy, RemoteOK, EU Remote Jobs, and LinkedIn.

Vercel sets `CRON_SECRET` automatically for cron requests. No GitHub Actions setup, no manual runs.

To trigger a sync immediately after deploy: Vercel → **Settings → Cron Jobs** → run once, or redeploy.

### Run sync locally (optional)

```bash
npm run sync:boards
npm run sync:companies
```

## Configuration

Sync behavior is driven by repo config (not shown in the UI):

| File | Purpose |
|------|---------|
| `config/filters.ts` | Target roles, 30-day recency |
| `config/boards.ts` | Job boards (No Fluff Jobs, Just Join IT, Bulldogjob, WWR, Jobicy, RemoteOK, EU Remote Jobs, LinkedIn) |
| `config/linkedin.ts` | LinkedIn guest-search queries (role × location) |
| `config/companies.ts` | Top companies + ATS slugs (Greenhouse/Lever/Ashby) |

Add ATS slugs to `config/companies.ts` as you discover them. Companies without `ats` are skipped by company sync.

### LinkedIn

LinkedIn has no public API, so Board uses LinkedIn's guest search endpoint (`jobs-guest`) during daily board sync — one query per role × region (Poland, EU, UK) in `config/linkedin.ts`.

To adjust LinkedIn coverage, edit `config/linkedin.ts` (roles from `config/filters.ts`, regions in `linkedinRegions`).

## How sync works

- **Board sync** and **company sync** are fully independent
- New jobs are inserted; existing jobs update `lastSeenAt`
- Your statuses and pages are never overwritten
- Jobs not seen in the latest sync for a source are marked **possibly closed**
- Jobs older than 45 days without a fresh sighting are also marked **possibly closed**

## Project structure

```
Board/
├── config/           ← FILTERS, BOARDS, TOP COMPANIES
├── src/app/jobs/     ← Jobs table
├── src/app/pages/    ← Markdown notes
├── src/lib/sync/     ← Sync fetchers + upsert logic
├── scripts/          ← seed + sync entrypoints
└── vercel.json       ← daily cron schedules
```
