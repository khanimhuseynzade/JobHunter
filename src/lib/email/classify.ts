import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";
import type { EmailMessage } from "./gmail";

export interface CandidateJob {
  id: string;
  company: string;
  role: string;
}

export interface Classification {
  jobId: string | null;
  suggestedStatus: "reached_out" | "rejected" | "expired" | null;
  confidence: number;
  reasoning: string;
}

const schema = z.object({
  jobId: z
    .string()
    .nullable()
    .describe(
      "The id of the matching candidate job, or null if the email does not clearly relate to any candidate job."
    ),
  suggestedStatus: z
    .enum(["reached_out", "rejected", "expired"])
    .nullable()
    .describe(
      [
        "reached_out = a HUMAN recruiter/hiring manager wants to move forward: interview or call invite, screening/assessment request, scheduling, or an explicit 'we'd like to talk / next steps'.",
        "rejected = declined, not moving forward, position filled by someone else.",
        "expired = the role itself was closed/withdrawn/no longer available.",
        "null = anything else, INCLUDING automated 'we received your application' / 'thanks for applying' acknowledgements that promise no concrete next step. An acknowledgement of receipt is NOT reached_out.",
      ].join(" ")
    ),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe("How confident this match + status is, 0-100."),
  reasoning: z.string().describe("One short sentence explaining the decision."),
});

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const NONE: Classification = {
  jobId: null,
  suggestedStatus: null,
  confidence: 0,
  reasoning: "No confident match.",
};

/**
 * Given a single email and the set of jobs the user has applied to, decide
 * whether the email implies a status change for one of them.
 */
export async function classifyEmail(
  email: EmailMessage,
  candidates: CandidateJob[]
): Promise<Classification> {
  if (candidates.length === 0) return NONE;

  const candidateList = candidates
    .map((c) => `- id=${c.id} | company="${c.company}" | role="${c.role}"`)
    .join("\n");

  const prompt = [
    "You triage a job seeker's inbox. Match the email below to exactly one of the",
    "candidate job applications, and infer whether it implies a status change.",
    "Only match if you are reasonably sure it refers to that company's application.",
    "Ignore newsletters, promotions, and generic job alerts (return null jobId).",
    "Do NOT treat an automated 'application received / thanks for applying'",
    "acknowledgement as a status change — only real progress or a rejection counts.",
    "",
    "Candidate applications:",
    candidateList,
    "",
    "Email:",
    `From: ${email.from}`,
    `Subject: ${email.subject}`,
    `Body:\n${(email.body || email.snippet).slice(0, 2000)}`,
  ].join("\n");

  try {
    const { object } = await generateObject({
      model: groq(MODEL),
      schema,
      prompt,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(40000),
      providerOptions: { groq: { reasoningEffort: "low" } },
    });

    if (!object.jobId || !candidates.some((c) => c.id === object.jobId)) {
      return NONE;
    }

    return object as Classification;
  } catch (err) {
    // Re-throw so the caller can distinguish a genuine "no match" (NONE) from a
    // transient failure (rate limit, timeout). Only genuine results should mark
    // a message as seen; failures must be retried on the next run.
    console.error("classifyEmail failed:", err);
    throw err;
  }
}
