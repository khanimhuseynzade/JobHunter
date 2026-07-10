import { NextResponse } from "next/server";
import { runCompanySync } from "@/lib/sync/run-company-sync";
import { verifyCronRequest } from "@/lib/sync/verify-cron";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCompanySync();
    return NextResponse.json({
      ok: true,
      searchType: result.searchType,
      jobsFound: result.jobsFound,
      jobsNew: result.jobsNew,
      jobsUpdated: result.jobsUpdated,
      errors: result.errors,
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
