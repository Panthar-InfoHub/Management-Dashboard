// Give an employee whose id is an empty string ('') a proper id.
// An empty id is a valid primary key, so sign-in works (it goes by Clerk id),
// but any code that treats '' as "no id" breaks (e.g. View As).
//
//   node scripts/fix-empty-employee-id.mjs                         show what would change
//   node scripts/fix-empty-employee-id.mjs --apply                 change it (test databases)
//   node scripts/fix-empty-employee-id.mjs --apply --production    change it on the live database
//
// Take a backup first: npm run db:backup
//
// Every foreign key to Employee is ON UPDATE CASCADE, so changing the id
// updates those columns by itself. The columns below hold employee ids without
// a foreign key, so they're updated here. All in one transaction.
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { Pool } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
const PRODUCTION_HOST = "ep-cold-violet-az87x6ra";
const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
const host = new URL(url).host;
const apply = process.argv.includes("--apply");
const isProduction = host.includes(PRODUCTION_HOST);
if (apply && isProduction && !process.argv.includes("--production")) {
  console.error(`${host} is the live database. Add --production to change it.`);
  process.exit(1);
}

/** Employee ids stored without a foreign key. */
const LOOSE = [
  { table: "AuditLog", column: "entityId", where: `"entity" = 'Employee'` },
  { table: "CalendarDay", column: "createdById" },
  { table: "Attendance", column: "reviewedById" },
  { table: "AttendanceEvent", column: "actorId" },
  { table: "EmploymentRecord", column: "changedById" },
];

/** Foreign keys to Employee.id, found from the schema (all ON UPDATE CASCADE). */
const FK_SQL = `
  select kcu.table_name::text as table, kcu.column_name::text as column, rc.update_rule::text as on_update
  from information_schema.referential_constraints rc
  join information_schema.key_column_usage kcu on kcu.constraint_name = rc.constraint_name and kcu.constraint_schema = rc.constraint_schema
  join information_schema.key_column_usage pk on pk.constraint_name = rc.unique_constraint_name and pk.constraint_schema = rc.unique_constraint_schema
  where pk.table_name = 'Employee' and pk.column_name = 'id' and kcu.table_schema = 'public'`;

/** A cuid-shaped id (25 characters, starts with "c"), like Prisma's @default(cuid()). */
const newId = () => `c${Date.now().toString(36)}${randomBytes(12).toString("hex")}`.slice(0, 25);

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
  console.log(`Database: ${host}${isProduction ? " (LIVE)" : ""}`);
  const people = (await client.query(`select "firstName", "lastName", role from "Employee" where id = ''`)).rows;
  if (people.length === 0) {
    console.log("No employee has an empty id. Nothing to do.");
    process.exit(0);
  }
  console.log(`Employee with an empty id: ${people.map((p) => `${p.firstName} ${p.lastName} (${p.role})`).join(", ")}`);

  const fks = (await client.query(FK_SQL)).rows;
  const notCascading = fks.filter((f) => f.on_update !== "CASCADE");
  if (notCascading.length) throw new Error(`These foreign keys don't cascade on update: ${notCascading.map((f) => `${f.table}.${f.column}`).join(", ")}`);

  const count = async (table, column, where) =>
    (await client.query(`select count(*)::int n from "${table}" where "${column}" = ''${where ? ` and ${where}` : ""}`)).rows[0].n;
  console.log("Rows pointing at it:");
  for (const f of fks) { const n = await count(f.table, f.column); if (n) console.log(`  ${f.table}.${f.column}: ${n} (updates by itself)`); }
  for (const l of LOOSE) { const n = await count(l.table, l.column, l.where); if (n) console.log(`  ${l.table}.${l.column}: ${n}`); }

  if (!apply) {
    console.log("\nNothing changed. Run again with --apply to give it a proper id.");
    process.exit(0);
  }

  const id = newId();
  await client.query("BEGIN");
  await client.query(`update "Employee" set id = $1 where id = ''`, [id]);
  for (const l of LOOSE) {
    await client.query(`update "${l.table}" set "${l.column}" = $1 where "${l.column}" = ''${l.where ? ` and ${l.where}` : ""}`, [id]);
  }
  // Nothing may still point at ''.
  for (const f of [...fks, ...LOOSE]) {
    const n = await count(f.table, f.column, f.where);
    if (n) throw new Error(`${f.table}.${f.column} still has ${n} rows with ''`);
  }
  await client.query("COMMIT");
  console.log(`\nDone. The employee's id is now ${id}. Anyone using View As as them should pick them again.`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(`Not changed: ${err.message}`);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
