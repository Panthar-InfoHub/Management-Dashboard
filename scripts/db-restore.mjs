// Restore a backup made by scripts/db-backup.mjs into an EMPTY database.
//
//   1. Create an empty database (e.g. a new Neon branch or database).
//   2. Create the schema:  DIRECT_URL=<target> npx prisma migrate deploy
//   3. Load the data:      RESTORE_DATABASE_URL=<target> node scripts/db-restore.mjs <backupDir>
//
// The target must have the same tables and every table must be empty; the
// script refuses otherwise, so it can never overwrite live data. It skips
// _prisma_migrations (step 2 already filled it) and runs in one transaction.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "@neondatabase/serverless";

const dir = process.argv[2];
const url = process.env.RESTORE_DATABASE_URL;
if (!dir || !url) {
  console.error("Usage: RESTORE_DATABASE_URL=<postgres url> node scripts/db-restore.mjs <backupDir>");
  process.exit(1);
}

const manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
const tables = manifest.tables.filter((t) => t !== "_prisma_migrations");
const fks = manifest.foreignKeys;
const nullable = new Set(manifest.columns.filter((c) => c.nullable).map((c) => `${c.table}.${c.column}`));

// Nullable foreign keys are loaded in a second pass, so self-references
// (Task.parentId) and cycles (Employee.teamId ↔ Team.leadId) don't matter.
const deferred = fks.filter((f) => nullable.has(`${f.table}.${f.column}`));
const required = fks.filter((f) => !nullable.has(`${f.table}.${f.column}`) && f.table !== f.ref_table);

// Order tables so every required parent is inserted before its children.
const order = [];
const visiting = new Set();
const visit = (t) => {
  if (order.includes(t)) return;
  if (visiting.has(t)) throw new Error(`Required foreign-key cycle at ${t}`);
  visiting.add(t);
  required.filter((f) => f.table === t).forEach((f) => visit(f.ref_table));
  visiting.delete(t);
  order.push(t);
};
tables.forEach(visit);

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
  await client.query("BEGIN");

  for (const t of tables) {
    const [{ n }] = (await client.query(`select count(*)::int as n from "${t}"`)).rows;
    if (n > 0) throw new Error(`Target table "${t}" has ${n} rows. Restore only into an empty database.`);
  }

  for (const t of order) {
    const rows = JSON.parse(await readFile(path.join(dir, "data", `${t}.json`), "utf8"));
    if (rows.length === 0) continue;
    const later = deferred.filter((f) => f.table === t).map((f) => f.column);
    const firstPass = rows.map((r) => {
      const copy = { ...r };
      later.forEach((c) => { copy[c] = null; });
      return copy;
    });
    await client.query(`insert into "${t}" select * from json_populate_recordset(null::"${t}", $1::json)`, [JSON.stringify(firstPass)]);
    console.log(`  ${t.padEnd(22)} ${rows.length} rows`);
  }

  for (const t of order) {
    const cols = deferred.filter((f) => f.table === t).map((f) => f.column);
    if (cols.length === 0) continue;
    const rows = JSON.parse(await readFile(path.join(dir, "data", `${t}.json`), "utf8"));
    if (rows.length === 0) continue;
    const keyCols = ["id", "A"].filter((k) => rows[0] && k in rows[0]);
    if (keyCols.length === 0) throw new Error(`No id column to update deferred keys on "${t}"`);
    const key = keyCols[0];
    const updates = rows.filter((r) => cols.some((c) => r[c] !== null)).map((r) => Object.fromEntries([[key, r[key]], ...cols.map((c) => [c, r[c]])]));
    if (updates.length === 0) continue;
    const set = cols.map((c) => `"${c}" = s."${c}"`).join(", ");
    await client.query(
      `update "${t}" d set ${set} from json_populate_recordset(null::"${t}", $1::json) s where d."${key}" = s."${key}"`,
      [JSON.stringify(updates)]
    );
  }

  for (const t of order) {
    const [{ n }] = (await client.query(`select count(*)::int as n from "${t}"`)).rows;
    if (n !== manifest.counts[t]) throw new Error(`Row count mismatch on "${t}": expected ${manifest.counts[t]}, got ${n}`);
  }

  await client.query("COMMIT");
  console.log("Restore complete. Row counts match the backup.");
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Restore failed; nothing was written.", err.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
