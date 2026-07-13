import "./load-env";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/schema";
import { seedJobs } from "@/lib/seed";

async function seed() {
  const db = getDb();
  if (!db) {
    console.log("No DATABASE_URL — using in-memory seed data at runtime.");
    return;
  }

  console.log("Seeding database…");

  for (const j of seedJobs) {
    await db
      .insert(jobs)
      .values({
        id: j.id as `${string}-${string}-${string}-${string}-${string}`,
        externalKey: j.externalKey,
        role: j.role,
        company: j.company,
        location: j.location,
        workMode: j.workMode,
        postedDate: j.postedDate,
        latencyDays: j.latencyDays,
        sourceType: j.sourceType,
        sourceName: j.sourceName,
        applyUrl: j.applyUrl,
        status: j.status,
        possiblyClosed: j.possiblyClosed,
        firstSeenAt: j.firstSeenAt,
        lastSeenAt: j.lastSeenAt,
      })
      .onConflictDoNothing();
  }

  console.log("Done.");
}

seed().catch(console.error);
