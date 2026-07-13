import "./load-env";
import { neon } from "@neondatabase/serverless";
import { companyRoleKey } from "../src/lib/sync/dedupe";

type JobStatus =
  | "applied"
  | "skipped"
  | "reached_out"
  | "rejected"
  | "expired";

interface StatusRow {
  external_key: string;
  role: string;
  company: string;
  status: JobStatus;
}

async function fetchStatusRows(url: string): Promise<StatusRow[]> {
  const sql = neon(url);
  return sql`
    SELECT external_key, role, company, status
    FROM jobs
    WHERE status IS NOT NULL
  ` as Promise<StatusRow[]>;
}

async function main() {
  const newUrl = process.env.DATABASE_URL;
  const oldUrl = process.env.OLD_DATABASE_URL;

  if (!newUrl) {
    console.error("DATABASE_URL is not set (current / target database).");
    process.exit(1);
  }
  if (!oldUrl) {
    console.error(
      "OLD_DATABASE_URL is not set. Add the old Neon connection string to .env."
    );
    process.exit(1);
  }

  const oldRows = await fetchStatusRows(oldUrl);
  if (oldRows.length === 0) {
    console.log("No statuses found in the old database.");
    return;
  }

  const sql = neon(newUrl);
  let updatedByKey = 0;
  let updatedByRole = 0;
  let skipped = 0;

  for (const row of oldRows) {
    const byKey = await sql`
      UPDATE jobs
      SET status = ${row.status}
      WHERE external_key = ${row.external_key}
        AND status IS NULL
      RETURNING id
    `;

    if (byKey.length > 0) {
      updatedByKey += byKey.length;
      continue;
    }

    const roleKey = companyRoleKey({
      company: row.company,
      role: row.role,
    });

    const candidates = await sql`
      SELECT id, company, role
      FROM jobs
      WHERE status IS NULL
    `;

    const match = candidates.find(
      (job) =>
        companyRoleKey({ company: job.company, role: job.role }) === roleKey
    );

    if (match) {
      await sql`
        UPDATE jobs
        SET status = ${row.status}
        WHERE id = ${match.id}
      `;
      updatedByRole += 1;
    } else {
      skipped += 1;
      console.log(
        `Skipped (no match): ${row.status} — ${row.role} @ ${row.company}`
      );
    }
  }

  const counts = await sql`
    SELECT status, count(*)::int as c
    FROM jobs
    WHERE status IS NOT NULL
    GROUP BY status
    ORDER BY status
  `;

  console.log(`Old rows with status: ${oldRows.length}`);
  console.log(`Updated by external_key: ${updatedByKey}`);
  console.log(`Updated by company+role: ${updatedByRole}`);
  console.log(`Skipped (no match): ${skipped}`);
  console.log("New database status counts:", counts);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
