// Logical backup of the whole database: every table's rows as JSON, plus the
// schema facts the restore needs (columns, foreign keys, applied migrations).
//
//   node scripts/db-backup.mjs [outDir]
//
// Reads DIRECT_URL (or DATABASE_URL) from .env.local. Writes to
// ../db-backups/<timestamp>/ by default, outside the repo: backups contain
// personal data and must never be committed.
import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { Pool } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error("DIRECT_URL or DATABASE_URL must be set in .env.local");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.resolve(process.argv[2] ?? path.join("..", "db-backups", stamp));
const pool = new Pool({ connectionString: url });
const q = async (sql, params) => (await pool.query(sql, params)).rows;

const client = await pool.connect();
try {
  // One consistent snapshot for every table.
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");

  const [{ version, db }] = (await client.query("select version()::text as version, current_database()::text as db")).rows;
  const tables = (await client.query(`
    select table_name::text as name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`)).rows.map((r) => r.name);

  const columns = (await client.query(`
    select table_name::text as table, column_name::text as column, data_type::text as type,
           is_nullable = 'YES' as nullable, ordinal_position::int as position
    from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`)).rows;

  const foreignKeys = (await client.query(`
    select tc.table_name::text as table, kcu.column_name::text as column,
           ccu.table_name::text as ref_table, ccu.column_name::text as ref_column
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
    join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'`)).rows;

  await mkdir(path.join(outDir, "data"), { recursive: true });

  const counts = {};
  const checksums = {};
  for (const table of tables) {
    // row_to_json keeps exact Postgres text forms (timestamps, arrays, json).
    const rows = (await client.query(`select row_to_json(t)::text as j from "${table}" t`)).rows.map((r) => JSON.parse(r.j));
    const body = JSON.stringify(rows);
    await writeFile(path.join(outDir, "data", `${table}.json`), body);
    counts[table] = rows.length;
    checksums[table] = createHash("sha256").update(body).digest("hex");
  }

  await client.query("COMMIT");

  const manifest = {
    createdAt: new Date().toISOString(),
    database: db,
    host: new URL(url).host,
    serverVersion: version,
    tables,
    counts,
    checksums,
    columns,
    foreignKeys,
  };
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`Backup written to ${outDir}`);
  for (const t of tables) console.log(`  ${t.padEnd(22)} ${counts[t]} rows`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  throw err;
} finally {
  client.release();
  await pool.end();
}
