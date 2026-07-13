import { NextResponse } from "next/server";
import { fetchJobs, updateJobStatus } from "@/lib/jobs";
import type { JobStatus, WorkMode } from "@/types";

const WORK_MODES = new Set<WorkMode>(["remote", "hybrid", "on_site"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const showSkipped = searchParams.get("showSkipped") === "true";
  const showClosed = searchParams.get("showClosed") === "true";
  const q = searchParams.get("q") ?? undefined;
  const workModeParam = searchParams.get("workMode");
  const workMode =
    workModeParam && WORK_MODES.has(workModeParam as WorkMode)
      ? (workModeParam as WorkMode)
      : undefined;

  const jobs = await fetchJobs({
    showSkipped,
    showClosed,
    q,
    workMode,
  });
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
