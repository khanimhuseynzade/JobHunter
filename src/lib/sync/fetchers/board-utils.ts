import type { SyncJobInput } from "../types";
import { formatLocation, inferWorkMode, isWithinMaxAge, matchesRole } from "../match";

const USER_AGENT = "Board/1.0";

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${url}`);
  }
  return (await res.json()) as T;
}

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { Accept: "*/*", "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${url}`);
  }
  return res.text();
}

export function parseIsoDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function xmlElementText(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function parseXmlBlocks(xml: string, tag: string): string[] {
  const blocks: string[] = [];
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

export function parseRssItems(xml: string): Array<{
  title: string;
  link: string;
  pubDate: string | null;
}> {
  return parseXmlBlocks(xml, "item").map((block) => ({
    title: xmlElementText(block, "title"),
    link: xmlElementText(block, "link"),
    pubDate: xmlElementText(block, "pubDate") || null,
  }));
}

export function toBoardJob(input: {
  externalKey: string;
  role: string;
  company: string;
  location: string;
  workMode: "remote" | "hybrid" | "on_site";
  postedDate: string | null;
  sourceName: string;
  applyUrl: string;
}): SyncJobInput | null {
  if (!matchesRole(input.role)) return null;
  if (!isWithinMaxAge(input.postedDate, input.sourceName)) return null;

  return {
    externalKey: input.externalKey,
    role: input.role,
    company: input.company,
    location: input.location,
    workMode: input.workMode,
    postedDate: input.postedDate,
    latencyDays: null,
    sourceType: "board",
    sourceName: input.sourceName,
    applyUrl: input.applyUrl,
  };
}

export function locationFromParts(parts: string[]): string {
  return formatLocation(parts);
}

export function workModeFromText(text: string, fullyRemote?: boolean): "remote" | "hybrid" | "on_site" {
  return inferWorkMode({ fullyRemote, locationText: text });
}
