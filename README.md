# Board

Personal job board — synced listings, status triage, and markdown notes.

## Stack

- **Next.js** — responsive web app (Jobs + Pages)
- **Neon Postgres** — persistent storage
- **GitHub Actions** — daily board + company sync (free)

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

## 3. Daily sync (GitHub Actions)

Two independent cron jobs run daily:

| Workflow | Schedule (UTC) | Command |
|----------|----------------|---------|
| `sync-boards.yml` | 06:00 | `npm run sync:boards` |
| `sync-companies.yml` | 06:30 | `npm run sync:companies` |

### Setup

1. In GitHub → **Settings → Secrets → Actions**, add `DATABASE_URL`
2. Enable workflows under the **Actions** tab
3. Run manually once via **workflow_dispatch** to test

### Run sync locally

```bash
DATABASE_URL=postgresql://... npm run sync:boards
DATABASE_URL=postgresql://... npm run sync:companies
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

LinkedIn has no public API, so Board uses two workarounds:

1. **Daily sync** — LinkedIn's guest search endpoint (`jobs-guest`) with one query per role × region (Poland, EU, UK) in `config/linkedin.ts`
2. **Manual import** — paste job URLs on the Jobs page (fetches each listing via the guest job API)

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
└── .github/workflows ← daily cron
```
