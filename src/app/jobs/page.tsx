import { after } from "next/server";
import { fetchJobs } from "@/lib/jobs";
import { reconcileJobsIfNeeded } from "@/lib/sync/reconcile";
import { JobsView } from "@/components/JobsView";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function JobsPage() {
  after(() => reconcileJobsIfNeeded());

  const jobs = await fetchJobs();
  return <JobsView initialJobs={jobs} />;
}
