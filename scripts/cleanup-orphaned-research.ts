/**
 * One-time cleanup: delete research_bundles rows orphaned by the move from
 * bare-cookie-hash userIds to prefixed `user:<id>` / `anon:<hash>` keys.
 *
 * Background: research row ownership now uses prefixed keys. Anything written
 * before that change has a bare cookie hash as its userId and will never match
 * a current owner — those packets are unreachable from the app forever, so we
 * delete them. (See server/research.ts -> effectiveOwner.)
 *
 * Anything with userId IS NULL or not starting with `user:` / `anon:` is
 * considered orphaned and removed. Run with:
 *
 *   npx tsx scripts/cleanup-orphaned-research.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../server/db";
import { researchBundles } from "../shared/schema";

async function main() {
  const before = await db.execute(sql`SELECT COUNT(*)::int AS n FROM research_bundles`);
  const total = (before.rows?.[0] as { n: number } | undefined)?.n ?? 0;

  const result = await db
    .delete(researchBundles)
    .where(
      sql`user_id IS NULL OR (user_id NOT LIKE 'user:%' AND user_id NOT LIKE 'anon:%')`
    )
    .returning({ id: researchBundles.id });

  console.log(
    `[cleanup-orphaned-research] total rows before: ${total}, deleted: ${result.length}`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("[cleanup-orphaned-research] failed:", err);
  process.exit(1);
});
