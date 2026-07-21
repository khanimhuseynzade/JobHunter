import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { emailSuggestions, jobs as jobsTable } from "@/lib/schema";
import { updateJobStatus } from "@/lib/jobs";
import type { JobStatus } from "@/types";

export interface EmailSuggestion {
  id: string;
  jobId: string | null;
  company: string | null;
  role: string | null;
  currentStatus: JobStatus | null;
  fromEmail: string;
  subject: string;
  receivedAt: string | null;
  snippet: string;
  suggestedStatus: JobStatus | null;
  confidence: number;
  reasoning: string;
  state: "pending" | "accepted" | "dismissed";
  createdAt: string;
}

export async function fetchPendingSuggestions(): Promise<EmailSuggestion[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: emailSuggestions.id,
      jobId: emailSuggestions.jobId,
      company: jobsTable.company,
      role: jobsTable.role,
      currentStatus: jobsTable.status,
      fromEmail: emailSuggestions.fromEmail,
      subject: emailSuggestions.subject,
      receivedAt: emailSuggestions.receivedAt,
      snippet: emailSuggestions.snippet,
      suggestedStatus: emailSuggestions.suggestedStatus,
      confidence: emailSuggestions.confidence,
      reasoning: emailSuggestions.reasoning,
      state: emailSuggestions.state,
      createdAt: emailSuggestions.createdAt,
    })
    .from(emailSuggestions)
    .leftJoin(jobsTable, eq(emailSuggestions.jobId, jobsTable.id))
    .where(eq(emailSuggestions.state, "pending"))
    .orderBy(desc(emailSuggestions.confidence), desc(emailSuggestions.createdAt));

  return rows as EmailSuggestion[];
}

/** Accept a suggestion: apply the suggested status to the job. */
export async function acceptSuggestion(
  id: string
): Promise<{ ok: boolean; jobId: string | null; status: JobStatus | null }> {
  const db = getDb();
  if (!db) return { ok: false, jobId: null, status: null };

  const [row] = await db
    .select()
    .from(emailSuggestions)
    .where(eq(emailSuggestions.id, id));

  if (!row) return { ok: false, jobId: null, status: null };

  if (row.jobId && row.suggestedStatus) {
    await updateJobStatus(row.jobId, row.suggestedStatus);
  }

  await db
    .update(emailSuggestions)
    .set({ state: "accepted" })
    .where(eq(emailSuggestions.id, id));

  return { ok: true, jobId: row.jobId, status: row.suggestedStatus };
}

export async function dismissSuggestion(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const result = await db
    .update(emailSuggestions)
    .set({ state: "dismissed" })
    .where(eq(emailSuggestions.id, id))
    .returning({ id: emailSuggestions.id });

  return result.length > 0;
}

/** Gmail message ids we've already stored, so we never re-classify them. */
export async function filterUnseenMessageIds(ids: string[]): Promise<Set<string>> {
  const db = getDb();
  if (!db || ids.length === 0) return new Set(ids);

  const existing = await db
    .select({ gmailMessageId: emailSuggestions.gmailMessageId })
    .from(emailSuggestions)
    .where(inArray(emailSuggestions.gmailMessageId, ids));

  const seen = new Set(existing.map((r) => r.gmailMessageId));
  return new Set(ids.filter((id) => !seen.has(id)));
}

export async function insertSuggestion(input: {
  gmailMessageId: string;
  jobId: string | null;
  fromEmail: string;
  subject: string;
  receivedAt: string | null;
  snippet: string;
  suggestedStatus: JobStatus | null;
  confidence: number;
  reasoning: string;
}): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db
    .insert(emailSuggestions)
    .values(input)
    .onConflictDoNothing({ target: emailSuggestions.gmailMessageId });
}

/** Jobs eligible to receive an email-driven status change. */
export async function fetchCandidateJobs(): Promise<
  { id: string; company: string; role: string }[]
> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: jobsTable.id,
      company: jobsTable.company,
      role: jobsTable.role,
    })
    .from(jobsTable)
    .where(inArray(jobsTable.status, ["applied", "reached_out"] as JobStatus[]));

  return rows;
}
