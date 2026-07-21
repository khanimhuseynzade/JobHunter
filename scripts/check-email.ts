import "./load-env";
import { runEmailCheck } from "@/lib/email/run-email-check";
import { fetchPendingSuggestions } from "@/lib/email/suggestions";

async function main() {
  const result = await runEmailCheck();
  console.log("Email check:", JSON.stringify(result), "\n");

  const suggestions = await fetchPendingSuggestions();
  console.log(`Pending suggestions: ${suggestions.length}`);
  for (const s of suggestions) {
    console.log(
      `- ${s.company ?? "?"} · ${s.role ?? "?"} | ${s.currentStatus ?? "—"} -> ${s.suggestedStatus} (${s.confidence}%) — ${s.subject}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
