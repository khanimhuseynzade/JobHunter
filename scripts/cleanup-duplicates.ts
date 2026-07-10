import "./load-env";
import { cleanupDuplicateBoardJobs } from "@/lib/sync/cleanup-duplicates";

async function main() {
  const { removed } = await cleanupDuplicateBoardJobs();
  console.log(
    removed > 0
      ? `Removed ${removed} duplicate board job${removed === 1 ? "" : "s"}.`
      : "No duplicate board jobs found."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
