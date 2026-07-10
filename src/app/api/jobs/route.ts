import { NextResponse } from "next/server";
import { fetchJobs, updateJobStatus } from "@/lib/jobs";
import type { JobStatus } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const showSkipped = searchParams.get("showSkipped") === "true";
  const showClosed = searchParams.get("showClosed") === "true";

  const jobs = await fetchJobs({ showSkipped, showClosed });
  return NextResponse.json(jobs);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, status } = body as { id: string; status: JobStatus | null };

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const job = await updateJobStatus(id, status ?? null);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
