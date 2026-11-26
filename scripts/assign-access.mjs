// One-time access setup after the role-enum migration, safe to run again.
//
//   node scripts/assign-access.mjs \
//     --super a@x.com,b@y.com      # these become SUPER_ADMIN
//     --admin c@z.com              # these become ADMIN
//     --member d@w.com             # these become MEMBER (e.g. demote an old admin)
//     --preset "HR=e@v.com"        # create preset HR (default HR permissions) and give it to e@v.com
//     [--dry-run]
//
// Uses DIRECT_URL from .env.local, so the target database is whatever
// .env.local points at. Access lives only in the database (Clerk is shared
// between demo and production, so nothing is written there).
import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });

const DEFAULT_PRESETS = {
  HR: {
    description: "People, attendance and leave for the whole company",
    permissions: [
      "employee:view-all", "employee:create", "employee:update", "employee:offboard",
      "attendance:view-all", "attendance:edit", "attendance:export",
      "leave:approve", "leave:manage",
    ],
  },
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const list = (flag) => {
  const i = args.indexOf(flag);
  return i === -1 ? [] : args[i + 1].split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
};
const presetArgs = args.flatMap((a, i) => (a === "--preset" ? [args[i + 1]] : []));

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const q = async (sql, params) => (await pool.query(sql, params)).rows;

async function setRole(emails, role) {
  for (const email of emails) {
    const rows = await q(`select id, "firstName" || ' ' || "lastName" as name from "Employee" where lower(email) = $1`, [email]);
    if (rows.length === 0) throw new Error(`No employee with email ${email}`);
    console.log(`${dryRun ? "[dry-run] " : ""}${rows[0].name} → ${role}`);
    if (!dryRun) await q(`update "Employee" set role = $1::"Role", "updatedAt" = now() where id = $2`, [role, rows[0].id]);
  }
}

try {
  await setRole(list("--super"), "SUPER_ADMIN");
  await setRole(list("--admin"), "ADMIN");
  await setRole(list("--member"), "MEMBER");

  for (const spec of presetArgs) {
    const [name, emailList = ""] = spec.split("=");
    const defaults = DEFAULT_PRESETS[name];
    let [preset] = await q(`select id from "AccessPreset" where name = $1`, [name]);
    if (!preset) {
      if (!defaults) throw new Error(`No default permissions for preset "${name}"; create it in Settings instead.`);
      console.log(`${dryRun ? "[dry-run] " : ""}create preset ${name} (${defaults.permissions.length} permissions)`);
      if (!dryRun) {
        [preset] = await q(
          `insert into "AccessPreset" (id, name, description, permissions, "updatedAt") values (gen_random_uuid()::text, $1, $2, $3, now()) returning id`,
          [name, defaults.description, defaults.permissions]
        );
      }
    }
    for (const email of emailList.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)) {
      const [emp] = await q(`select id, role::text, "firstName" || ' ' || "lastName" as name from "Employee" where lower(email) = $1`, [email]);
      if (!emp) throw new Error(`No employee with email ${email}`);
      if (emp.role !== "MEMBER") { console.log(`skip preset for ${emp.name}: ${emp.role} already has every permission`); continue; }
      console.log(`${dryRun ? "[dry-run] " : ""}preset ${name} → ${emp.name}`);
      if (!dryRun && preset) {
        await q(
          `insert into "EmployeeAccessPreset" ("employeeId", "presetId", "grantedBy") values ($1, $2, 'script') on conflict do nothing`,
          [emp.id, preset.id]
        );
      }
    }
  }

} finally {
  await pool.end();
}
