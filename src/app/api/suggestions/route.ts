import { NextResponse } from "next/server";
import {
  acceptSuggestion,
  dismissSuggestion,
  fetchPendingSuggestions,
} from "@/lib/email/suggestions";

export const dynamic = "force-dynamic";

export async function GET() {
  const suggestions = await fetchPendingSuggestions();
  return NextResponse.json(suggestions);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, action } = body as {
    id?: string;
    action?: "accept" | "dismiss";
  };

  if (!id || (action !== "accept" && action !== "dismiss")) {
    return NextResponse.json(
      { error: "Provide id and action ('accept' | 'dismiss')." },
      { status: 400 }
    );
  }

  if (action === "accept") {
    const result = await acceptSuggestion(id);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  }

  const ok = await dismissSuggestion(id);
  if (!ok) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
