import { NextResponse } from "next/server";
import { runBoardSync } from "@/lib/sync/run-board-sync";
import { runCompanySync } from "@/lib/sync/run-company-sync";
import { verifyCronRequest } from "@/lib/sync/verify-cron";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const boards = await runBoardSync();
    const companies = await runCompanySync();

    return NextResponse.json({
      ok: true,
      boards: {
        jobsFound: boards.jobsFound,
        jobsNew: boards.jobsNew,
        jobsUpdated: boards.jobsUpdated,
        jobsRemovedDuplicates: boards.jobsRemovedDuplicates ?? 0,
        errors: boards.errors,
      },
      companies: {
        jobsFound: companies.jobsFound,
        jobsNew: companies.jobsNew,
        jobsUpdated: companies.jobsUpdated,
        jobsRemovedDuplicates: companies.jobsRemovedDuplicates ?? 0,
        errors: companies.errors,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
