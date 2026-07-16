# Panthar Teams: Production Readiness & Architecture Roadmap

This document outlines the comprehensive strategy for transitioning the Panthar Teams prototype into a live, production-ready, enterprise-grade operations platform. It details the required technical architecture, data flows, performance strategies, and Role-Based Access Control (RBAC) necessary for real-world company usage.

---

## 1. Current State (Phase 1 Prototype)

Currently, the platform operates as a **high-fidelity UI prototype**:
- **UI/UX**: Production-grade layout using Next.js App Router, Tailwind CSS, and Shadcn UI.
- **Interactions**: Native HTML5 Drag-and-Drop, global command palettes, and full-screen creation pages.
- **State Management**: Data (Tasks, Projects, Employees, Teams) is entirely mocked (`lib/mock-data.ts`) and managed via ephemeral local React State (`useState`). Data is lost upon a hard refresh.
- **Security**: No authentication or authorization is currently active.

---

## 2. Technical Architecture & Next Steps

To make this a live, usable product, we must implement a robust backend infrastructure. 

### Phase 2: Database & ORM Integration
- **Database**: **PostgreSQL** (via Neon or Supabase) for robust, relational data integrity.
- **ORM**: **Prisma** for type-safe database queries and migrations.
- **Data Modeling**: 
  - Translate the current `mock-data.ts` shapes into strict Prisma schema models (`User`, `Team`, `Project`, `Task`, `DailyUpdate`).
  - Establish relational constraints (e.g., a Task belongs to a Project and is assigned to a User).

### Phase 3: Authentication & Identity
- **Provider**: **Clerk** (as identified in project skills) for secure, scalable authentication.
- **Integration**: Protect all dashboard routes using Clerk's Next.js Middleware.
- **Sync**: Use Clerk Webhooks to sync user creation/updates directly into our local PostgreSQL database to maintain referential integrity with Tasks and Projects.

### Phase 4: Service Layer & Strict Data Access (No Mock Data)
To ensure production-grade security, performance, and maintainability, **NO database calls will be made directly inside UI components**. Instead, we will implement a strict Service Layer architecture:

- **`lib/queries/` (Data Access Layer - DAL)**: 
  - Contains all `select` and `findMany` logic for fetching data. 
  - Every query MUST call `requireAuth()` first to ensure the user is authorized.
  - Returns strictly typed, minimal payloads to React Server Components (RSCs).
- **`lib/actions/` (Server Actions - Mutations)**:
  - Contains all `create`, `update`, and `delete` logic marked with `"use server"`.
  - Enforces RBAC (Role-Based Access Control) using `hasPermission()` from `lib/permissions.ts`.
  - Performs Zod validation on incoming payloads before writing to the database.
  - Responsible for cache invalidation via `revalidatePath`.
- **UI Layer (Server & Client Components)**:
  - **Server Components** await functions from `lib/queries/` and pass raw data as props to Client Components.
  - **Client Components** handle state (like drag-and-drop) using `useOptimistic` for instant feedback, then call functions from `lib/actions/` to persist changes.

---

## 3. Roles, Permissions, & Regulations (RBAC)

For proper company usage, data must be heavily regulated based on user clearance. We will implement three primary tiers of access:

| Role | Permissions & Capabilities | Platform Flow |
| :--- | :--- | :--- |
| **Admin / Exec** | Complete read/write access across all scopes. Can create/delete Projects, Teams, and assign managers. Can view organization-wide analytics and billing. | Has unrestricted access to the Command Palette and all settings configurations. |
| **Team Manager** | Can read/write within their assigned Team scope. Can create Tasks, assign them to team members, and update Project statuses. Cannot create new overarching Projects. | Focuses on `/tasks` and `/teams`. Can approve Daily Updates from their direct reports. |
| **Employee (IC)** | Can view assigned Tasks and Projects. Can update the status of *their own* Tasks (Drag & Drop). Must submit Daily Updates. Cannot assign tasks to others. | Focuses heavily on the `/daily-updates` workflow and moving their personal task cards on the Kanban board. |

**Implementation Strategy:** 
Clerk Organizations and Custom Claims will be used to inject the user's role directly into their session token, allowing middleware to instantly block unauthorized page views without hitting the database.

---

## 4. Operational Workflows & Regulations

To ensure the platform actually drives company productivity, the following regulations will be enforced programmatically:


1. **Task State Regulations**: 
   - A Task cannot be moved to "Done" unless a "PR Link" or "Completion Note" is attached.
   - Tasks left in "In Progress" for more than 7 days will automatically flag the Team Manager via UI indicators.
2. **Audit Logging**: Every major action (Project creation, Task reassignment, Status changes) will write an entry to an `AuditLog` table. This is critical for enterprise compliance.

---

## 5. Performance & Optimization Strategy

Enterprise operations software must feel instantaneous.

1. **Caching (Next.js)**
   - Utilize Next.js Data Cache for infrequently changing data (e.g., Team Rosters, Employee Directories).
   - Use `revalidatePath` inside Server Actions when a Task or Project is updated to precisely invalidate only the affected UI components.
2. **Client-Side Boundaries**
   - Keep interactive components (Kanban Boards, Modals) as `'use client'`, but pass pre-fetched data from Server Components as props. This minimizes client-side JavaScript bundles.
3. **Database Indexing**
   - Apply B-Tree indexes on heavily queried foreign keys: `assigneeId`, `projectId`, and `teamId`.
   - Apply compound indexes for filtering (e.g., `[status, assigneeId]` for the task board).

---

## 6. Deployment Topology

- **Hosting**: **Vercel** for edge-optimized Next.js deployment.
- **Database Edge Caching**: Utilize Prisma Accelerate or Neon's connection pooling to handle high concurrency during morning "Daily Update" spikes.
- **CI/CD pipeline**: Require passing TypeScript checks, ESLint, and a successful Prisma Schema validation before merging to the `main` branch.
