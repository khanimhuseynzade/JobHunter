import "./load-env";
import { neon } from "@neondatabase/serverless";

const MIGRATION = `
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS missed_syncs integer NOT NULL DEFAULT 0;
`;

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = neon(url);
  await sql(MIGRATION);

  console.log("Migration complete — jobs.missed_syncs column ready.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
