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

const HIRING_SIGNAL =
  /interview|application|applied|reject|unfortunately|next steps|\boffer\b|recruit|hiring|thank you for applying|not moving forward|assessment|assignment|screening|shortlist|we received your/i;

function matchingCandidateNeedles(
  email: EmailMessage,
  companies: string[]
): string[] {
  const fromSubject = `${email.from} ${email.subject}`.toLowerCase();
  const body = `${email.body || email.snippet}`.toLowerCase();
  const bodyHasHiringSignal = HIRING_SIGNAL.test(
    `${email.subject} ${email.snippet} ${email.body}`
  );

  return companies.filter((c) => {
    if (c.length < 3) return false;
    if (fromSubject.includes(c)) return true;
    return bodyHasHiringSignal && body.includes(c);
  });
}

/** Keep emails that mention a candidate company in From/Subject, or in the body with a hiring signal. */
function emailMentionsCandidate(
  email: EmailMessage,
  companies: string[]
): boolean {
  return matchingCandidateNeedles(email, companies).length > 0;
}

function candidatesForEmail<T extends { company: string }>(
  email: EmailMessage,
  candidates: T[]
): T[] {
  const needles = new Set(
    matchingCandidateNeedles(
      email,
      candidates.map((c) => normalizeCompany(c.company))
    )
  );
  return candidates.filter((c) => needles.has(normalizeCompany(c.company)));
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
const CLASSIFY_GAP_MS = 12_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(err: unknown): number | null {
  if (err && typeof err === "object" && "responseHeaders" in err) {
    const headers = (err as { responseHeaders?: Record<string, string> })
      .responseHeaders;
    const sec = Number(headers?.["retry-after"]);
    if (Number.isFinite(sec) && sec > 0) return Math.min(sec, 90) * 1000;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/rate_limit|tokens per minute|Request too large|429/i.test(msg)) {
    return 45_000;
  }
  return null;
}

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
      skipped: "No applied/reached-out/in-progress jobs to match against",
      messagesScanned: 0,
      messagesNew: 0,
      suggestionsCreated: 0,
      errors: null,
    };
  }

  const query =
    process.env.EMAIL_LOOKBACK ||
    "newer_than:2d -category:promotions -category:social";
  const maxResults = Number(process.env.EMAIL_MAX_RESULTS) || 40;

  let messages;
  try {
    messages = await listRecentMessages(query, maxResults);
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

  for (const [index, email] of relevant.entries()) {
    const matched = candidatesForEmail(email, candidates);
    if (matched.length === 0) continue;

    if (index > 0) await sleep(CLASSIFY_GAP_MS);

    let result;
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          result = await classifyEmail(email, matched);
          break;
        } catch (err) {
          const wait = attempt < 3 ? retryAfterMs(err) : null;
          if (wait == null) throw err;
          await sleep(wait);
        }
      }
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
