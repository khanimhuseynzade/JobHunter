import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", [
  "applied",
  "skipped",
  "reached_out",
  "rejected",
  "expired",
  "error",
]);

export const sourceTypeEnum = pgEnum("source_type", ["board", "company"]);

export const workModeEnum = pgEnum("work_mode", [
  "remote",
  "hybrid",
  "on_site",
]);

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalKey: text("external_key").notNull().unique(),
  role: text("role").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull().default(""),
  workMode: workModeEnum("work_mode").notNull().default("remote"),
  postedDate: timestamp("posted_date", { mode: "string" }),
  latencyDays: integer("latency_days"),
  sourceType: sourceTypeEnum("source_type").notNull(),
  sourceName: text("source_name").notNull(),
  applyUrl: text("apply_url").notNull(),
  status: jobStatusEnum("status"),
  possiblyClosed: boolean("possibly_closed").notNull().default(false),
  firstSeenAt: timestamp("first_seen_at", { mode: "string" })
    .notNull()
    .defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { mode: "string" })
    .notNull()
    .defaultNow(),
});

export const syncLogs = pgTable("sync_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  searchType: text("search_type").notNull(),
  ranAt: timestamp("ran_at", { mode: "string" }).notNull().defaultNow(),
  jobsFound: integer("jobs_found").notNull().default(0),
  jobsNew: integer("jobs_new").notNull().default(0),
  errors: text("errors"),
});

export const suggestionStateEnum = pgEnum("suggestion_state", [
  "pending",
  "accepted",
  "dismissed",
]);

export const emailSuggestions = pgTable("email_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  gmailMessageId: text("gmail_message_id").notNull().unique(),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "cascade" }),
  fromEmail: text("from_email").notNull().default(""),
  subject: text("subject").notNull().default(""),
  receivedAt: timestamp("received_at", { mode: "string" }),
  snippet: text("snippet").notNull().default(""),
  suggestedStatus: jobStatusEnum("suggested_status"),
  confidence: integer("confidence").notNull().default(0),
  reasoning: text("reasoning").notNull().default(""),
  state: suggestionStateEnum("state").notNull().default("pending"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});
