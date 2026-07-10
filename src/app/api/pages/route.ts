import { NextResponse } from "next/server";
import { fetchPages, upsertPage } from "@/lib/pages";
import type { PageFolder } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder") as PageFolder | null;

  const pages = await fetchPages(folder ?? undefined);
  return NextResponse.json(pages);
}

export async function POST(request: Request) {
  const body = await request.json();
  const page = await upsertPage(body);
  return NextResponse.json(page);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const page = await upsertPage(body);
  return NextResponse.json(page);
}
