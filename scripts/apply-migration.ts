/**
 * Apply a SQL migration file directly against POSTGRES_DB_URL.
 * drizzle-kit push/migrate hangs on the Supabase transaction pooler, so:
 *   bun scripts/apply-migration.ts drizzle/0004_ds_projects_screens.sql
 */
import fs from "node:fs";
import postgres from "postgres";

const file = process.argv[2];
if (!file) {
  console.error("usage: bun scripts/apply-migration.ts <file.sql>");
  process.exit(1);
}

const url = process.env.POSTGRES_DB_URL;
if (!url) {
  console.error("POSTGRES_DB_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });
const ddl = fs.readFileSync(file, "utf8");

try {
  await sql.unsafe(ddl);
  console.log(`applied ${file}`);
} finally {
  await sql.end();
}
