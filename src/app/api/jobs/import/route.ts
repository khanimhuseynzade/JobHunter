import { NextResponse } from "next/server";
import { importLinkedInUrls } from "@/lib/sync/fetchers/linkedin";
import { upsertSyncJobs } from "@/lib/sync/upsert";

export async function POST(request: Request) {
  const body = await request.json();
  const urls = Array.isArray(body?.urls)
    ? body.urls.filter((url: unknown) => typeof url === "string")
    : typeof body?.url === "string"
      ? [body.url]
      : [];

  if (urls.length === 0) {
    return NextResponse.json(
      { error: "Provide one or more LinkedIn job URLs" },
      { status: 400 }
    );
  }

  const { imported, skipped, errors } = await importLinkedInUrls(urls);

  if (imported.length === 0) {
    return NextResponse.json(
      {
        error: "No matching jobs imported",
        skipped,
        errors,
      },
      { status: 422 }
    );
  }

  const result = await upsertSyncJobs("boards", "LinkedIn", imported);

  return NextResponse.json({
    imported: imported.length,
    jobsNew: result.jobsNew,
    jobsUpdated: result.jobsUpdated,
    skipped,
    errors,
  });
}
