import { fetchPages } from "@/lib/pages";
import { fetchJobs } from "@/lib/jobs";
import { PagesView } from "@/components/PagesView";

interface PagesPageProps {
  searchParams: Promise<{ job?: string }>;
}

export default async function PagesPage({ searchParams }: PagesPageProps) {
  const params = await searchParams;
  const pages = await fetchPages();

  let linkedJobTitle: string | null = null;
  if (params.job) {
    const jobs = await fetchJobs({ showSkipped: true, showClosed: true });
    const job = jobs.find((j) => j.id === params.job);
    if (job) {
      linkedJobTitle = `${job.company} — ${job.role}`;
    }
  }

  return (
    <PagesView
      initialPages={pages}
      linkedJobId={params.job ?? null}
      linkedJobTitle={linkedJobTitle}
    />
  );
}
