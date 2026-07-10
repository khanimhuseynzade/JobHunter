import "./load-env";
import { runBoardSync } from "@/lib/sync/run-board-sync";

async function main() {
  const result = await runBoardSync();
  const removed = result.jobsRemovedDuplicates ?? 0;
  console.log(
    `Board sync complete — found ${result.jobsFound}, new ${result.jobsNew}, updated ${result.jobsUpdated}, removed ${removed} duplicate${removed === 1 ? "" : "s"}`
  );
  if (result.errors.length > 0) {
    console.warn("Errors:");
    for (const error of result.errors) console.warn(`- ${error}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
