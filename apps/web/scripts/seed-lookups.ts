import {
  CARGO_EXPRESS_ROUTES,
  COAL_PARTIES,
  COMMODITIES,
  CONTAINER_PARTIES,
} from "./lib/aliases.js";
import { adminClient } from "./lib/supabase.js";

async function main() {
  const supabase = adminClient();

  async function seed(
    name: string,
    table: string,
    rows: Record<string, unknown>[],
    onConflict: string,
  ) {
    const { error } = await supabase
      .from(table)
      .upsert(rows as never, { onConflict });
    if (error) throw error;
    console.log(`  ✓ ${name}: ${rows.length}`);
  }

  await Promise.all([
    seed(
      "commodities",
      "commodities",
      COMMODITIES.map((c) => ({ ...c, active: true })),
      "name",
    ),
    seed(
      "container_parties",
      "container_parties",
      CONTAINER_PARTIES.map((p) => ({ ...p, active: true })),
      "name",
    ),
    seed(
      "coal_parties",
      "coal_parties",
      COAL_PARTIES.map((p) => ({ ...p, active: true })),
      "name",
    ),
    seed(
      "cargo_express_routes",
      "cargo_express_routes",
      CARGO_EXPRESS_ROUTES.map((r) => ({ ...r, active: true })),
      "code",
    ),
  ]);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
