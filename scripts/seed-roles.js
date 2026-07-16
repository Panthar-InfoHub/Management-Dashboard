require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALL_PERMISSIONS = [
  "task:create", "task:assign", "task:update:own", "task:update:any", "task:delete", "task:move:own", "task:move:any",
  "project:create", "project:update", "project:delete", "project:view",
  "team:create", "team:update", "team:manage-members",
  "employee:view:all", "employee:update:own", "employee:update:any", "employee:role:change",
  "update:submit", "update:view:team", "update:view:all",
  "leave:request", "leave:approve", "leave:view:team", "leave:view:all", "leave:balance:edit",
  "attendance:view:own", "attendance:view:team", "attendance:view:all", "attendance:edit",
  "reports:view", "reports:export",
  "settings:view", "audit:view"
];

async function main() {
  console.log("Seeding Roles...");

  // Admin has all permissions
  await prisma.systemRole.upsert({
    where: { name: "ADMIN" },
    update: { permissions: ALL_PERMISSIONS, isSystem: true },
    create: { name: "ADMIN", permissions: ALL_PERMISSIONS, isSystem: true }
  });

  // Manager has most permissions
  const managerPerms = ALL_PERMISSIONS.filter(p => !p.includes("delete") && !p.includes("settings") && !p.includes("audit") && !p.includes("export"));
  await prisma.systemRole.upsert({
    where: { name: "MANAGER" },
    update: { permissions: managerPerms, isSystem: true },
    create: { name: "MANAGER", permissions: managerPerms, isSystem: true }
  });

  // Employee has basic permissions
  const employeePerms = [
    "task:update:own", "task:move:own", "project:view", "employee:update:own",
    "update:submit", "leave:request", "attendance:view:own"
  ];
  await prisma.systemRole.upsert({
    where: { name: "EMPLOYEE" },
    update: { permissions: employeePerms, isSystem: true },
    create: { name: "EMPLOYEE", permissions: employeePerms, isSystem: true }
  });

  // Intern has read-only or very restricted permissions
  const internPerms = [
    "project:view", "attendance:view:own", "update:submit"
  ];
  await prisma.systemRole.upsert({
    where: { name: "INTERN" },
    update: { permissions: internPerms, isSystem: false },
    create: { name: "INTERN", permissions: internPerms, isSystem: false }
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
