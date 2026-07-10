import { runCompanySync } from "@/lib/sync/run-company-sync";

async function main() {
  const result = await runCompanySync();
  console.log(
    `Company sync complete — found ${result.jobsFound}, new ${result.jobsNew}, updated ${result.jobsUpdated}`
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
