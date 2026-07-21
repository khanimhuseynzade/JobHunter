import { google, type gmail_v1 } from "googleapis";

export interface EmailMessage {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  date: string | null;
  snippet: string;
  body: string;
}

export function hasGmailConfig(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
  );
}

function getGmailClient(): gmail_v1.Gmail {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Gmail credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)."
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth });
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8"
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";

  let plain = "";
  let html = "";

  const walk = (part: gmail_v1.Schema$MessagePart) => {
    const mimeType = part.mimeType ?? "";
    const data = part.body?.data;
    if (data) {
      if (mimeType === "text/plain") plain += decodeBase64Url(data);
      else if (mimeType === "text/html") html += decodeBase64Url(data);
    }
    for (const child of part.parts ?? []) walk(child);
  };

  walk(payload);

  const text = plain.trim() || (html ? stripHtml(html) : "");
  return text.slice(0, 8000);
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string {
  const header = headers?.find(
    (h) => (h.name ?? "").toLowerCase() === name.toLowerCase()
  );
  return header?.value ?? "";
}

function parseEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim().toLowerCase();
}

/** Fetch recent messages matching a Gmail search query (e.g. "newer_than:2d"). */
export async function listRecentMessages(
  query: string,
  maxResults = 40
): Promise<EmailMessage[]> {
  const gmail = getGmailClient();

  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  const ids = (list.data.messages ?? [])
    .map((m) => m.id)
    .filter((id): id is string => Boolean(id));

  const messages: EmailMessage[] = [];

  for (const id of ids) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });

    const payload = detail.data.payload;
    const headers = payload?.headers;
    const from = getHeader(headers, "From");
    const dateHeader = getHeader(headers, "Date");
    const internalDate = detail.data.internalDate
      ? new Date(Number(detail.data.internalDate)).toISOString()
      : dateHeader
        ? new Date(dateHeader).toISOString()
        : null;

    messages.push({
      id,
      from,
      fromEmail: parseEmailAddress(from),
      subject: getHeader(headers, "Subject"),
      date: internalDate,
      snippet: detail.data.snippet ?? "",
      body: extractBody(payload),
    });
  }

  return messages;
}
