import { NextResponse } from "next/server";
import { fetchSyncStatus } from "@/lib/sync-log";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await fetchSyncStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store" },
  });
}
