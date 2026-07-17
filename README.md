# Panthar Teams (InfoHub)

Panthar Teams is an enterprise-grade, highly secure Project & Task Management Command Center built for modern agile teams. It features real-time Kanban boards, hierarchical team structures, and an incredibly robust Granular Role-Based Access Control (RBAC) system.

## 🚀 Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & Radix UI (shadcn/ui)
- **Database:** PostgreSQL (via Prisma ORM)
- **Authentication:** Clerk Auth

## 🛡️ Granular RBAC & Security Model

Panthar Teams doesn't just use simple roles (Admin/Employee). It uses a highly granular, capability-based permission schema (e.g., `task:create`, `project:delete`, `team:update`). This allows for dynamic roles to be crafted in the Settings dashboard.

### Global Roles
- **ADMIN (Superuser):** Automatically bypasses all database permission checks. Admins can view, edit, and delete any task, project, or team across the entire organization.
- **MANAGER:** Typically holds global `update` and `create` permissions, allowing them to oversee multiple projects, but may be restricted from destructive `delete` actions.
- **EMPLOYEE / INTERN:** Base-level access. By default, they lack global update/delete permissions and are highly restricted. However, they are granted **Contextual Privileges** based on their daily work.

### Contextual Privileges & Edge Cases

To ensure workers aren't blocked while keeping the system secure, Panthar features intelligent contextual bypasses:

#### 1. Project Leads & Team Leads
If you are assigned as the `leadId` of a Project or Team:
- **What you CAN do:** You can fully edit the project/team details (Name, Description, Status, Priority) and manage the member list.
- **What you CANNOT do:** You cannot delete the project/team (requires global `:delete` permission).
- **Edge Case (Handoff):** If a Lead edits the project and changes the `leadId` to someone else, they instantly transfer ownership and lose their Lead privileges.
- **Edge Case (Self-Lockout):** The UI explicitly prevents Leads from accidentally unchecking their own name when managing members.

#### 2. Task Creators (Authorship)
If an Intern creates a task or subtask, they are recognized as its `creatorId`.
- **What you CAN do:** Creators can edit the core details (Title, Description, Priority, Dates) of their own tasks.
- **Edge Case (Removal):** If a creator is completely removed from a project, they instantly lose access to edit their tasks. They must be an active project member to retain creator rights.

#### 3. Assignees & Project Members (Status Editors)
If a worker is assigned to a task or is a member of the project, but they did NOT create the task:
- **What you CAN do:** You can view the task and update its **Status** (e.g., move it from *In Progress* to *Done*). You can also add Subtasks to break down your own work.
- **What you CANNOT do:** You cannot edit the task's title, description, deadlines, or priority. The "Edit Task" button is completely hidden.
- **Edge Case (Re-assignment Loophole):** Non-editors cannot assign tasks to other people. If they create a subtask, it auto-assigns to them and the assignee dropdown is permanently disabled, preventing interns from forcefully assigning work to senior managers.

## 📋 Core Features

### 1. Dynamic Kanban Board
A real-time workspace that strictly filters visibility based on access. 
- Employees only see tasks if they are explicitly assigned to them or if they are a member of the parent project.
- Visual indicators for blocked tasks, priorities, and assignees.

### 2. Task Dependencies & Subtasks
- **Blockers:** Tasks can be marked as "Blocked By" another task. When the blocker is marked as `DONE`, the blocked task is automatically unblocked via server actions.
- **Subtasks:** Infinite nesting of subtasks to break down complex architectural work.

### 3. Vercel-Inspired UI Aesthetics
The entire platform is built with a premium, high-density "tech-giant" aesthetic utilizing subtle glassmorphism, crisp borders, and deep dark-mode contrasts.

## 🛠️ Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Ensure your `.env` contains:
   - `DATABASE_URL` (PostgreSQL connection string)
   - Clerk API Keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)

3. **Database Setup:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   *Note: Next.js Turbopack is utilized for extreme compilation speeds.*
