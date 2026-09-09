require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('../lib/generated/prisma');
const { PrismaNeon } = require('@prisma/adapter-neon');
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Must match lib/permission-list.ts's Permission type exactly — these are the
// only strings lib/permissions.ts ever checks against.
const ALL_PERMISSIONS = [
  "task:create", "task:update", "task:delete", "task:assign",
  "project:create", "project:update", "project:delete",
  "team:create", "team:update", "team:delete",
  "employee:create", "employee:update", "employee:delete",
  "role:manage", "permission:delegate"
];

async function main() {
  console.log("Seeding Roles...");

  // Admin has all permissions
  await prisma.systemRole.upsert({
    where: { name: "ADMIN" },
    update: { permissions: ALL_PERMISSIONS, isSystem: true },
    create: { name: "ADMIN", permissions: ALL_PERMISSIONS, isSystem: true }
  });

  // Manager has most permissions, including task deletion, but not project/team/employee deletion or role management
  const managerPerms = [...ALL_PERMISSIONS.filter(p => !p.includes("delete") && p !== "role:manage"), "task:delete"];
  await prisma.systemRole.upsert({
    where: { name: "MANAGER" },
    update: { permissions: managerPerms, isSystem: true },
    create: { name: "MANAGER", permissions: managerPerms, isSystem: true }
  });

  // Employee and Intern get no global permissions — their access to tasks is
  // entirely resource-scoped (assignee/project-member checks in task.actions.ts),
  // not a blanket role permission. Granting e.g. "task:update" here would bypass
  // those per-task ownership checks for every task in the org.
  await prisma.systemRole.upsert({
    where: { name: "EMPLOYEE" },
    update: { permissions: [], isSystem: true },
    create: { name: "EMPLOYEE", permissions: [], isSystem: true }
  });

  await prisma.systemRole.upsert({
    where: { name: "INTERN" },
    update: { permissions: [], isSystem: false },
    create: { name: "INTERN", permissions: [], isSystem: false }
  });

  console.log("Seeded Roles successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
