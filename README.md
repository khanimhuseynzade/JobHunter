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
| `/api/cron/check-email` | 14:00 | Reads Gmail, suggests status changes (see below) |

Board sync includes No Fluff Jobs, Just Join IT, Bulldogjob, We Work Remotely, Jobicy, RemoteOK, EU Remote Jobs, and LinkedIn.

Vercel sets `CRON_SECRET` automatically for cron requests. No GitHub Actions setup, no manual runs.

To trigger a sync immediately after deploy: Vercel → **Settings → Cron Jobs** → run once, or redeploy.

### Run sync locally (optional)

```bash
npm run sync:boards
npm run sync:companies
```

## 3. Email → status suggestions (optional)

Once a day a cron reads your Gmail, uses an LLM to match recruiter emails to jobs
you've marked **Applied** or **Reached out**, and creates **suggestions** for a
status change (e.g. Applied → Rejected). Suggestions appear in a panel on the
Jobs page with **Accept** / **Dismiss** — nothing is applied automatically.

### One-time Google setup

1. In [Google Cloud Console](https://console.cloud.google.com): create a project and enable the **Gmail API**.
2. Configure the **OAuth consent screen** (External). Add your own Google account as a **test user**. Note: in "testing" mode Google expires refresh tokens after ~7 days — publish the app to avoid this.
3. Create an **OAuth client** of type **Web application** and add the redirect URI: `http://localhost:5555/oauth2callback`.
4. Put the client id/secret in `.env`:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

5. Run the one-time auth flow, open the printed URL, approve, and copy the token it prints into `.env`:

```bash
npm run gmail:auth
# → GOOGLE_REFRESH_TOKEN=...
```

6. Add a free Groq key (used to classify emails, no credit card) from [console.groq.com/keys](https://console.groq.com/keys):

```bash
GROQ_API_KEY=...
# optional: GROQ_MODEL=openai/gpt-oss-20b   EMAIL_LOOKBACK=newer_than:2d
```

7. Create the suggestions table:

```bash
npm run db:migrate:email-suggestions   # or: npm run db:push
```

### Deploy

Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, and
`GROQ_API_KEY` to your Vercel project env. The `/api/cron/check-email` cron then
runs daily. If the Gmail env vars are missing, the cron is a safe no-op.

### Run the email check locally

```bash
npm run email:check
```

Only jobs marked **Applied** or **Reached out** are matched. To limit LLM calls,
an email is only sent to the model if it mentions one of those companies; plain
"application received" acknowledgements are ignored, so only real progress or a
rejection creates a suggestion.

## Configuration

Sync behavior is driven by repo config (not shown in the UI):

| File | Purpose |
|------|---------|
| `config/filters.ts` | Target roles, exclude patterns, age limits |
| `config/boards.ts` | Job boards + Just Join IT categories |
| `config/linkedin.ts` | LinkedIn guest-search queries (role × location) |
| `config/companies.ts` | Target companies + ATS slugs (Greenhouse/Lever/Ashby) |

Add ATS slugs to `config/companies.ts` as you discover them. Companies without `ats` are skipped by company sync.

### Hunt profile — target roles

Each role in `config/filters.ts` has a `pattern` (primary title), optional `aliases`, and optional `linkedInKeywords` (extra LinkedIn-only search terms).

| Pattern | Aliases | LinkedIn-only keywords |
|---------|---------|------------------------|
| Product Designer | Product Design | Digital Product Designer, Mobile Product Designer |
| UX Designer | UX Design, User Experience Designer | — |
| UX/UI Designer | UI/UX Designer, UX UI Designer | — |
| UI Designer | UI Design | — |
| Interaction Designer | — | — |
| Design Systems Designer | Design System Designer | — |
| Experience Designer | — | — |
| Web Designer | — | — |
| AI Designer | AI Product Designer | AI Product Designer |
| UI Engineer | — | — |
| Design Engineer | — | — |
| Platform Designer | — | — |

**Exclude patterns** — titles that contain a hunt pattern but are not relevant:

```
graphic designer, motion designer, brand designer, visual designer,
game designer, level designer, instructional designer, learning designer,
sound designer, interior designer, fashion designer, industrial designer,
packaging designer, marketing designer, content designer
```

**LinkedIn remote-only extra searches** (EU-wide): Product Designer, UX Designer, UI Designer, Design Engineer.

**Age filters:**

- `maxAgeDays: 30` — only ingest listings posted within 30 days
- `staleAfterDays: 45` — mark as "possibly closed" if not seen in 45 days

**Per-source date policy** (`allowUnknownDate` in `config/filters.ts`):

- Default: `true` (keep jobs with unknown dates)
- No Fluff Jobs, Just Join IT, LinkedIn: `false` (require dates)

### Title matching logic

Implemented in `src/lib/sync/match.ts`:

1. Strip seniority prefixes: Senior, Sr, Junior, Jr, Lead, Staff, Principal, Head, Associate, Mid, Entry-level, Intern, Director, VP, Chief
2. Normalize: lowercase, collapse whitespace, treat `/` as space
3. Word-boundary match — pattern must appear as a whole phrase
4. Exclude check runs before include check
5. Match patterns = all patterns + aliases, sorted longest-first
6. Work mode inference: `fullyRemote` → remote; `hybridDesc` → hybrid; location text → remote/hybrid; else `on_site`
7. Latency = days between `postedDate` and now

### Job boards (8 sources)

Board sync and company sync are fully independent.

| Board | Provider | API / Feed |
|-------|----------|------------|
| No Fluff Jobs | `nofluffjobs` | `GET https://nofluffjobs.com/api/posting?limit=12000` |
| Just Join IT | `justjoinit` | `GET https://justjoin.it/api/candidate-api/offers` (paginated) |
| Bulldogjob | `bulldogjob` | `GET https://bulldogjob.com/api/v2/jobs` (XML) |
| We Work Remotely | `weworkremotely` | RSS: `https://weworkremotely.com/categories/remote-design-jobs.rss` |
| Jobicy | `jobicy` | `tag=design`, `industry=design-multimedia`, `industry=web-app-design` |
| RemoteOK | `remoteok` | `GET https://remoteok.com/api` |
| EU Remote Jobs | `euremotejobs` | RSS: `https://euremotejobs.com/feed/` |
| LinkedIn | `linkedin` | Guest API (see below) |

**Just Join IT categories:** `ux`, `mobile`, `pm`, `ai`, `other`

**Board-specific logic:**

- **No Fluff Jobs** — group duplicates by title + company + posted timestamp; merge locations; prefer remote variant; key: `board:nfj:{slug}`
- **Just Join IT** — paginate with cursor; strip random 8-char hash from reposted slugs; stop when full page is outside `maxAgeDays`; key: `board:jjit:{slugBase}`
- **Bulldogjob** — parse XML `<job>` blocks; no posted date (unknown date allowed)
- **We Work Remotely** — RSS; title format `"Company: Role"`; always remote
- **Jobicy** — dedupe by `id` across 3 query endpoints
- **RemoteOK** — skip metadata rows; use `epoch` or `date` for posted date
- **EU Remote Jobs** — RSS feed; company often unknown

User-Agent for all fetches: `Board/1.0`

### LinkedIn guest search

LinkedIn has no public API. Board uses the guest endpoint during daily board sync:

```
GET https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search
```

Query params: `keywords`, `location`, `start` (pagination), `count=25`, `f_TPR=r2592000` (past 30 days), `f_WT=2` (remote only, for remote searches).

**Regions:** Poland, European Union, United Kingdom

**Search matrix:** every `searchRole` × every region, plus remote-only searches for `linkedInRemoteRoles` at EU.

**Config** (`config/linkedin.ts`): 3 pages per search, 750ms delay between requests, 3 retries per page.

External key: `board:linkedin:{jobId}`

### Company career pages (ATS APIs)

Only companies with `ats` in `config/companies.ts` are synced.

| Provider | API |
|----------|-----|
| Greenhouse | `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs` |
| Lever | `https://api.lever.co/v0/postings/{slug}?mode=json` |
| Ashby | `https://api.ashbyhq.com/posting-api/job-board/{slug}` |

**Configured companies:** Future Mind, Docplanner, Revolut, ElevenLabs, PandaDoc (greenhouse), Booksy, Allegro, n8n, Qonto (lever), Remote (greenhouse), Contentsquare (lever), Kittl, Hostaway, HelloFresh, AirHelp.

External keys: `company:{provider}:{slug}:{jobId}` · Source name: `"{Company} careers"`

## How sync works

### Pipeline

**Board sync** (`runBoardSync`):

1. Fetch all enabled boards (errors per board don't stop others)
2. `dedupeSyncJobs()` on collected results
3. `upsertSyncJobs()` per board source
4. `cleanupDuplicateBoardJobs()` — remove DB duplicates by company + role
5. `markGlobalStaleJobs()` — flag jobs not seen in 45 days
6. Write sync log

**Company sync** (`runCompanySync`): same pattern, per company with ATS.

**Reconcile on page load** (`reconcileJobsIfNeeded`): 30-min cooldown; stale threshold 12h (prod) / 1h (dev); runs duplicate cleanup then full sync if stale.

### Upsert rules

- New job → insert with `status: null`, `possiblyClosed: false`
- Existing job → update metadata + `lastSeenAt`, clear `possiblyClosed`
- Jobs from same source NOT in current sync → `possiblyClosed: true`
- **User statuses are never overwritten**

### Dedup logic

Dedup runs at fetch time (`dedupeSyncJobs`) and in the DB (`cleanupDuplicateBoardJobs`):

- By normalized `externalKey` (JJIT slug base, NFJ URL base)
- By normalized `applyUrl`
- By `companyRoleKey` = `normalizeCompany(company) | normalizeRole(role)`
  - Strip legal suffixes: Sp. z o.o., Ltd, Inc, GmbH, S.A.
  - Strip country suffixes: Poland, Polska, UK, USA, Europe
  - Strip seniority from role title

**Keeper preference** when duplicates share company + role:

1. Job with user status wins over statusless
2. Company source (score 2) > LinkedIn (score 1) > other boards (score 0)
3. Most recent `lastSeenAt`
4. On delete: transfer status from duplicate to keeper if keeper has no status

### Default display sort

1. Unstatused jobs first
2. Newest `postedDate`
3. Remote > hybrid > on-site
4. Company source > LinkedIn > boards
5. Lowest latency days

## Database schema

**`jobs`:** `id`, `external_key` (unique), `role`, `company`, `location`, `work_mode`, `posted_date`, `latency_days`, `source_type` (board | company), `source_name`, `apply_url`, `status` (applied | skipped | reached_out | rejected | expired | null), `possibly_closed`, `first_seen_at`, `last_seen_at`

**`sync_logs`:** `id`, `search_type`, `ran_at`, `jobs_found`, `jobs_new`, `errors`

**`email_suggestions`:** `id`, `gmail_message_id` (unique), `job_id` (→ jobs), `from_email`, `subject`, `received_at`, `snippet`, `suggested_status`, `confidence`, `reasoning`, `state` (pending | accepted | dismissed), `created_at`

## UI

- **Jobs page** (`/jobs`) — table (desktop) + cards (mobile)
- **Status triage:** applied, skipped, reached_out, rejected, expired, or empty
- **Search** by role, company, location, source; **filter** by work mode
- **Toggles:** show skipped, show possibly closed
- **Sort** by status, role, company, work mode, latency
- **Job detail panel** with apply link, source, posted date, possibly-closed warning
- **Stats header:** total jobs, added today, applied count, last sync date

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/jobs` | GET | List jobs (`showSkipped`, `showClosed`, `q`, `workMode`) |
| `/api/jobs` | PATCH | Update status `{ id, status }` |
| `/api/sync` | GET | Last sync timestamps |
| `/api/suggestions` | GET | Pending email status suggestions |
| `/api/suggestions` | PATCH | Resolve a suggestion `{ id, action: "accept" \| "dismiss" }` |
| `/api/cron/sync-all` | GET | Run board + company sync (cron auth via `CRON_SECRET`) |
| `/api/cron/check-email` | GET | Read Gmail → create status suggestions (cron auth via `CRON_SECRET`) |

## Customization

To adapt for a different role hunt:

1. Edit `config/filters.ts` — `huntRoles`, `excludePatterns`, `linkedInRemoteRoles`
2. Edit `config/boards.ts` — enable/disable boards, change JJIT categories
3. Edit `config/linkedin.ts` — change regions
4. Edit `config/companies.ts` — add companies and ATS slugs
5. Adjust `maxAgeDays` / `staleAfterDays` as needed

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
