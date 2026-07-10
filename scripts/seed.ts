import { getDb } from "@/lib/db";
import { jobs, pages } from "@/lib/schema";
import { seedJobs, seedPages } from "@/lib/seed";

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
        pageId: j.pageId as `${string}-${string}-${string}-${string}-${string}` | null,
        firstSeenAt: j.firstSeenAt,
        lastSeenAt: j.lastSeenAt,
      })
      .onConflictDoNothing();
  }

  for (const p of seedPages) {
    await db
      .insert(pages)
      .values({
        id: p.id as `${string}-${string}-${string}-${string}-${string}`,
        title: p.title,
        body: p.body,
        folder: p.folder,
        linkedJobId: p.linkedJobId as `${string}-${string}-${string}-${string}-${string}` | null,
        linkedCompany: p.linkedCompany,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })
      .onConflictDoNothing();
  }

  console.log("Done.");
}

seed().catch(console.error);
