import { NextResponse } from "next/server";
import { fetchSyncStatus } from "@/lib/sync-log";

export async function GET() {
  const status = await fetchSyncStatus();
  return NextResponse.json(status);
}
