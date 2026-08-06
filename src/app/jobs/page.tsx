import { after } from "next/server";
import { fetchJobs } from "@/lib/jobs";
import { fetchSyncStatus } from "@/lib/sync-log";
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

  // Fetch jobs and the last-sync timestamp together. We always pull possibly
  // closed listings (`showClosed: true`) so the client has them in memory, then
  // decide visibility per range: the "All" tab shows them (dimmed, until they're
  // deleted at removeAfterMissedSyncs), while 7d/30d hide them unless the user
  // flips the "Show closed" filter. Both are server-rendered so the initial
  // count and the "Last updated" label are correct on first paint. The page is
  // force-dynamic, so a reload always reflects the current DB state (which only
  // changes when the twice-daily cron sync runs).
  const [jobs, sync] = await Promise.all([
    fetchJobs({ showSkipped, showClosed: true, q }),
    fetchSyncStatus(),
  ]);

  return (
    <JobsView
      initialJobs={jobs}
      initialLastSync={sync.latest}
      initialQuery={q ?? ""}
      initialShowSkipped={showSkipped}
      initialShowClosed={showClosed}
    />
  );
}
