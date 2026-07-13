import "./load-env";
import { neon } from "@neondatabase/serverless";

const MIGRATION = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'job_status'
      AND e.enumlabel = 'expired'
  ) THEN
    ALTER TYPE job_status ADD VALUE 'expired';
  END IF;
END $$;
`;

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = neon(url);
  await sql(MIGRATION);

  console.log("Migration complete — job_status enum includes 'expired'.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
