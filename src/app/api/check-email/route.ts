import { NextResponse } from "next/server";
import { runEmailCheck } from "@/lib/email/run-email-check";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Manual trigger from the UI (no cron secret — this app has no auth).
export async function POST() {
  try {
    const result = await runEmailCheck();
    return NextResponse.json({ ok: true, ...result });
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
