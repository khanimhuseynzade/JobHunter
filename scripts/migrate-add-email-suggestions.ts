import "./load-env";
import { neon } from "@neondatabase/serverless";

const CREATE_ENUM = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'suggestion_state') THEN
    CREATE TYPE suggestion_state AS ENUM ('pending', 'accepted', 'dismissed');
  END IF;
END $$;
`;

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS email_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id text NOT NULL UNIQUE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  from_email text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  received_at timestamp,
  snippet text NOT NULL DEFAULT '',
  suggested_status job_status,
  confidence integer NOT NULL DEFAULT 0,
  reasoning text NOT NULL DEFAULT '',
  state suggestion_state NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now()
);
`;

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = neon(url);
  // Neon's HTTP driver runs one statement per call.
  await sql(CREATE_ENUM);
  await sql(CREATE_TABLE);

  console.log("Migration complete — email_suggestions table is ready.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
