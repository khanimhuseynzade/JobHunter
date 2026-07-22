import { getDb } from "@/lib/db";
import { syncLogs } from "@/lib/schema";
import { classifyEmail } from "./classify";
import { hasGmailConfig, listRecentMessages } from "./gmail";
import {
  fetchCandidateJobs,
  filterUnseenMessageIds,
  insertSuggestion,
} from "./suggestions";
import type { EmailMessage } from "./gmail";

/** Normalize a company name for loose substring matching. */
function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(sp\.?\s*z\s*o\.?o\.?|s\.?a\.?|inc|ltd|llc|gmbh|bv|ab)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Keep only emails that plausibly mention one of the candidate companies. */
function emailMentionsCandidate(
  email: EmailMessage,
  companies: string[]
): boolean {
  const haystack =
    `${email.from} ${email.subject} ${email.body || email.snippet}`.toLowerCase();
  return companies.some((c) => c.length >= 3 && haystack.includes(c));
}

export interface EmailCheckResult {
  skipped?: string;
  messagesScanned: number;
  messagesNew: number;
  messagesClassified?: number;
  suggestionsCreated: number;
  errors: string | null;
}

const MIN_CONFIDENCE = 55;

export async function runEmailCheck(): Promise<EmailCheckResult> {
  if (!hasGmailConfig()) {
    return {
      skipped: "Gmail not configured",
      messagesScanned: 0,
      messagesNew: 0,
      suggestionsCreated: 0,
      errors: null,
    };
  }

  const candidates = await fetchCandidateJobs();

  if (candidates.length === 0) {
    return {
      skipped: "No applied/reached-out jobs to match against",
      messagesScanned: 0,
      messagesNew: 0,
      suggestionsCreated: 0,
      errors: null,
    };
  }

  const query =
    process.env.EMAIL_LOOKBACK ||
    "newer_than:2d -category:promotions -category:social";

  let messages;
  try {
    messages = await listRecentMessages(query);
  } catch (err) {
    return {
      messagesScanned: 0,
      messagesNew: 0,
      suggestionsCreated: 0,
      errors: err instanceof Error ? err.message : String(err),
    };
  }

  const unseen = await filterUnseenMessageIds(messages.map((m) => m.id));
  const newMessages = messages.filter((m) => unseen.has(m.id));

  const companyNeedles = candidates.map((c) => normalizeCompany(c.company));
  const relevant = newMessages.filter((m) =>
    emailMentionsCandidate(m, companyNeedles)
  );

  let suggestionsCreated = 0;
  const errors: string[] = [];

  for (const email of relevant) {
    let result;
    try {
      result = await classifyEmail(email, candidates);
    } catch (err) {
      // Classification failed (rate limit, timeout, etc.). Don't record the
      // message as seen so it is retried on the next run.
      errors.push(err instanceof Error ? err.message : String(err));
      continue;
    }

    const confident =
      !!result.jobId &&
      !!result.suggestedStatus &&
      result.confidence >= MIN_CONFIDENCE;

    // Record every successfully-classified message so it is never re-classified.
    // Confident matches become pending suggestions; everything else is stored as
    // "dismissed" purely to mark it seen.
    await insertSuggestion({
      gmailMessageId: email.id,
      jobId: confident ? result.jobId : null,
      fromEmail: email.fromEmail,
      subject: email.subject,
      receivedAt: email.date,
      snippet: email.snippet,
      suggestedStatus: confident ? result.suggestedStatus : null,
      confidence: result.confidence,
      reasoning: result.reasoning,
      state: confident ? "pending" : "dismissed",
    });

    if (confident) suggestionsCreated += 1;
  }

  const errorText = errors.length ? errors.join("; ") : null;

  const db = getDb();
  if (db) {
    await db.insert(syncLogs).values({
      searchType: "email",
      jobsFound: newMessages.length,
      jobsNew: suggestionsCreated,
      errors: errorText,
    });
  }

  return {
    messagesScanned: messages.length,
    messagesNew: newMessages.length,
    messagesClassified: relevant.length,
    suggestionsCreated,
    errors: errorText,
  };
}
