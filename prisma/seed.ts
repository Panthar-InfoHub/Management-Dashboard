// ── Database Seed Script ──
// Seeds the database with initial data for development/testing.
// Run: npx prisma db seed
//
// IMPORTANT: After running this, you need to manually set the first admin.
// Use: npx prisma studio → find your employee → change role to ADMIN

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ── Create Dynamic Roles ──
  const ALL_PERMISSIONS = [
    "task:create", "task:assign", "task:update:own", "task:update:any", "task:delete", "task:move:own", "task:move:any",
    "project:create", "project:update", "project:delete", "project:view",
    "team:create", "team:update", "team:manage-members",
    "employee:view:all", "employee:update:own", "employee:update:any", "employee:delete:any", "employee:role:change",
    "update:submit", "update:view:team", "update:view:all",
    "leave:request", "leave:approve", "leave:view:team", "leave:view:all", "leave:balance:edit",
    "attendance:view:own", "attendance:view:team", "attendance:view:all", "attendance:edit",
    "reports:view", "reports:export",
    "settings:view", "audit:view"
  ];

  await prisma.systemRole.upsert({
    where: { name: "ADMIN" },
    update: { permissions: ALL_PERMISSIONS, isSystem: true },
    create: { name: "ADMIN", permissions: ALL_PERMISSIONS, isSystem: true }
  });

  const managerPerms = ALL_PERMISSIONS.filter(p => !p.includes("delete") && !p.includes("settings") && !p.includes("audit") && !p.includes("export"));
  await prisma.systemRole.upsert({
    where: { name: "MANAGER" },
    update: { permissions: managerPerms, isSystem: true },
    create: { name: "MANAGER", permissions: managerPerms, isSystem: true }
  });

  const employeePerms = [
    "task:update:own", "task:move:own", "project:view", "employee:update:own",
    "update:submit", "leave:request", "attendance:view:own"
  ];
  await prisma.systemRole.upsert({
    where: { name: "EMPLOYEE" },
    update: { permissions: employeePerms, isSystem: true },
    create: { name: "EMPLOYEE", permissions: employeePerms, isSystem: true }
  });

  const internPerms = ["project:view", "attendance:view:own", "update:submit"];
  await prisma.systemRole.upsert({
    where: { name: "INTERN" },
    update: { permissions: internPerms, isSystem: false },
    create: { name: "INTERN", permissions: internPerms, isSystem: false }
  });

  console.log("✅ Created System Roles");

  // ── Create Teams ──
  const backend = await prisma.team.upsert({
    where: { name: "Backend" },
    update: {},
    create: {
      name: "Backend",
      color: "#006bff",
      icon: "⚡",
      description: "Backend engineering team — APIs, services, and infrastructure",
      lead: {
        connectOrCreate: {
          where: { email: "seed-backend-lead@panthar.io" },
          create: {
            clerkId: "seed_backend_lead",
            email: "seed-backend-lead@panthar.io",
            firstName: "Backend",
            lastName: "Lead",
            role: "MANAGER",
            designation: "Engineering Lead",
          },
        },
      },
    },
  });

  const frontend = await prisma.team.upsert({
    where: { name: "Frontend" },
    update: {},
    create: {
      name: "Frontend",
      color: "#a000f8",
      icon: "🎨",
      description: "Frontend engineering team — UI, UX implementation, and client apps",
      lead: {
        connectOrCreate: {
          where: { email: "seed-frontend-lead@panthar.io" },
          create: {
            clerkId: "seed_frontend_lead",
            email: "seed-frontend-lead@panthar.io",
            firstName: "Frontend",
            lastName: "Lead",
            role: "MANAGER",
            designation: "Senior Frontend Engineer",
          },
        },
      },
    },
  });

  const design = await prisma.team.upsert({
    where: { name: "Design" },
    update: {},
    create: {
      name: "Design",
      color: "#f22782",
      icon: "🖌️",
      description: "Design team — UX research, visual design, and prototyping",
      lead: {
        connectOrCreate: {
          where: { email: "seed-design-lead@panthar.io" },
          create: {
            clerkId: "seed_design_lead",
            email: "seed-design-lead@panthar.io",
            firstName: "Design",
            lastName: "Lead",
            role: "MANAGER",
            designation: "UX Designer",
          },
        },
      },
    },
  });

  const product = await prisma.team.upsert({
    where: { name: "Product" },
    update: {},
    create: {
      name: "Product",
      color: "#ffa600",
      icon: "📦",
      description: "Product team — strategy, roadmap, and analytics",
      lead: {
        connectOrCreate: {
          where: { email: "seed-product-lead@panthar.io" },
          create: {
            clerkId: "seed_product_lead",
            email: "seed-product-lead@panthar.io",
            firstName: "Product",
            lastName: "Lead",
            role: "MANAGER",
            designation: "Product Manager",
          },
        },
      },
    },
  });

  console.log(`✅ Created teams: ${backend.name}, ${frontend.name}, ${design.name}, ${product.name}`);

  // ── Create a sample project ──
  const backendLead = await prisma.employee.findUnique({ where: { email: "seed-backend-lead@panthar.io" } });

  if (backendLead) {
    await prisma.project.upsert({
      where: { id: "seed-project-1" },
      update: {},
      create: {
        id: "seed-project-1",
        name: "Panthar Platform v3",
        description: "Complete platform rewrite with modern architecture",
        status: "ACTIVE",
        health: "GOOD",
        priority: "CRITICAL",
        progress: 35,
        teamId: backend.id,
        leadId: backendLead.id,
        startDate: new Date("2026-01-15"),
        endDate: new Date("2026-08-30"),
      },
    });
    console.log("✅ Created sample project");
  }

  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Next steps:");
  console.log("  1. Sign up via Clerk — this creates your Employee record via webhook");
  console.log("  2. Open Prisma Studio: npx prisma studio");
  console.log("  3. Find your employee record and change role to ADMIN");
  console.log("  4. Refresh the app — you now have full admin access\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
