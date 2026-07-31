import { after } from "next/server";
import { fetchJobs } from "@/lib/jobs";
import { reconcileJobsIfNeeded } from "@/lib/sync/reconcile";
import { JobsView } from "@/components/JobsView";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  after(() => reconcileJobsIfNeeded());

  const sp = await searchParams;
  const showSkipped = first(sp.showSkipped) === "true";
  const showClosed = first(sp.showClosed) === "true";
  const q = first(sp.q)?.trim() || undefined;

  // Fetch with the same filters the client will apply, so the initial
  // server-rendered count matches the client and doesn't flicker on reload.
  const jobs = await fetchJobs({ showSkipped, showClosed, q });

  return (
    <JobsView
      initialJobs={jobs}
      initialQuery={q ?? ""}
      initialShowSkipped={showSkipped}
      initialShowClosed={showClosed}
    />
  );
}
