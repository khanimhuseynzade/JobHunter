import { fetchJobs } from "@/lib/jobs";
import { JobsView } from "@/components/JobsView";

export default async function JobsPage() {
  const jobs = await fetchJobs();
  return <JobsView initialJobs={jobs} />;
}
