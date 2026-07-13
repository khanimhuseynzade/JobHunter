import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import "./load-env";
import { neon } from "@neondatabase/serverless";
import { companyRoleKey } from "../src/lib/sync/dedupe";

type JobStatus =
  | "applied"
  | "skipped"
  | "reached_out"
  | "rejected"
  | "expired";

interface JsonJob {
  external_key: string;
  role: string;
  company: string;
  status: JobStatus | null;
  first_seen_at: string | null;
}

interface DbJob {
  id: string;
  external_key: string;
  company: string;
  role: string;
  status: JobStatus | null;
  first_seen_at: string;
}

function pickMatch(
  row: JsonJob,
  byKey: Map<string, DbJob>,
  byRoleKey: Map<string, DbJob[]>
): DbJob | null {
  const byExternal = byKey.get(row.external_key);
  if (byExternal) return byExternal;

  const group = byRoleKey.get(
    companyRoleKey({ company: row.company, role: row.role })
  );
  if (!group?.length) return null;
  if (group.length === 1) return group[0];

  return group.find((job) => job.status === null) ?? group[0];
}

async function main() {
  const filePath = resolve(
    process.argv[2] ?? `${process.env.HOME}/Downloads/jobs.json`
  );
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const rows = JSON.parse(readFileSync(filePath, "utf8")) as JsonJob[];
  const sql = neon(url);

  const dbJobs = (await sql`
    SELECT id, external_key, company, role, status, first_seen_at
    FROM jobs
  `) as DbJob[];

  const byKey = new Map(dbJobs.map((job) => [job.external_key, job]));
  const byRoleKey = new Map<string, DbJob[]>();

  for (const job of dbJobs) {
    const key = companyRoleKey(job);
    const group = byRoleKey.get(key) ?? [];
    group.push(job);
    byRoleKey.set(key, group);
  }

  let statusUpdated = 0;
  let firstSeenUpdated = 0;
  let skipped = 0;

  for (const row of rows) {
    const match = pickMatch(row, byKey, byRoleKey);
    if (!match) {
      if (row.status) {
        skipped += 1;
        console.log(
          `Skipped (no match): ${row.status} — ${row.role} @ ${row.company}`
        );
      }
      continue;
    }

    if (row.status && match.status === null) {
      await sql`
        UPDATE jobs
        SET status = ${row.status}
        WHERE id = ${match.id}
      `;
      match.status = row.status;
      statusUpdated += 1;
    }

    if (row.first_seen_at) {
      const jsonTime = new Date(row.first_seen_at).getTime();
      const dbTime = new Date(match.first_seen_at).getTime();

      if (!Number.isNaN(jsonTime) && jsonTime < dbTime) {
        await sql`
          UPDATE jobs
          SET first_seen_at = ${row.first_seen_at}
          WHERE id = ${match.id}
        `;
        match.first_seen_at = row.first_seen_at;
        firstSeenUpdated += 1;
      }
    }
  }

  const counts = await sql`
    SELECT status, count(*)::int as c
    FROM jobs
    WHERE status IS NOT NULL
    GROUP BY status
    ORDER BY status
  `;

  const addedToday = await sql`
    SELECT count(*)::int as c
    FROM jobs
    WHERE first_seen_at::date = CURRENT_DATE
  `;

  console.log(`Imported from: ${filePath}`);
  console.log(`JSON rows: ${rows.length}`);
  console.log(`Statuses restored: ${statusUpdated}`);
  console.log(`first_seen_at restored: ${firstSeenUpdated}`);
  console.log(`Skipped (no match): ${skipped}`);
  console.log("Status counts now:", counts);
  console.log(`Added today now: ${addedToday[0].c}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
