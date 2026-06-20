import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "path";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL is required");
  process.exit(1);
}

async function runMigrations() {
  console.log("🔄  Running database migrations...");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
  });

  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder: path.resolve("migrations") });
    console.log("✅  Migrations complete");
  } catch (err) {
    console.error("❌  Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
