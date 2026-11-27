# Panthar Teams

Single-org operations, project/task management, HR records, attendance, leave, and approvals platform built with **Next.js 16.4 (App Router, Cache Components & Partial Prefetching)**, **TypeScript**, **Tailwind CSS**, **Radix UI / shadcn**, **Prisma + PostgreSQL (Neon)**, and **Clerk**.

---

## Tech Stack

- **Framework:** Next.js `16.4.6` (App Router, Turbopack, `cacheComponents: true`, `partialPrefetching: true`)
- **Language & UI:** TypeScript, React 19, Tailwind CSS v4, Radix UI (`shadcn`), Lucide Icons, Recharts, Leaflet
- **Database:** PostgreSQL via Prisma ORM (`@prisma/adapter-neon`)
- **Auth:** Clerk (`@clerk/nextjs`) with invite-only onboarding
- **Exports & Tests:** ExcelJS (`.xlsx`), `tsx --test` (`node:test`)

---

## Features at a Glance

- **Dashboard** — Role-aware overview with clock card, KPIs, throughput charts, attention tasks, project health, workload, team attendance, and announcements.
- **Tasks** — Kanban board, bulk actions, general (`GEN-n`) and project (`KEY-n`) tasks, subtasks, blockers, completion notes, and comments.
- **My Tasks** — Personal open task list grouped by due-date urgency plus tasks awaiting your review.
- **Projects** — Team-owned projects with custom keys, leads, member rosters, progress calculation, and deadlines.
- **Teams** — Multi-team memberships, team leads, and team-scoped task/member stats.
- **Members** — Invite-only employee directory, profiles, Panthar/KavachX codes, role/access controls, promotions, and offboarding.
- **Records** — Company-wide immutable employment history ledger (`JOINED`, `PROMOTION`, `TRANSFER`, `TITLE_CHANGE`, `REHIRED`, `EXITED`).
- **Attendance** — GPS-geofenced clock-in, location-free clock-out (one clock-in and one clock-out per day), late cut-off with grace minutes, overtime, early leave, missed-checkout detection, WFH handling, and monthly calendar.
- **Attendance Rules** — `/rules`, a plain-language page for employees: what to do every day, when late, when a time is wrong, WFH and leave.
- **Team Attendance & Day View** — Org/team monthly attendance grid, daily status board, inline admin corrections, and Excel export.
- **External Attendance API** — API-key-authenticated endpoint (`POST /api/attendance/punch`) for timestamped `CHECK_IN` / `CHECK_OUT` / `AUTO` punches.
- **Leave** — Prorated annual leave balances, half-day/full-day leave requests, and year-boundary rules without carry-over.
- **Approvals** — Unified inbox for Leave, WFH, Late Arrival and Time Correction ("Correct My Time") requests; the approver picks the day's status.
- **Announcements** — Company-wide or team-targeted pinned/expiring updates with notifications.
- **Notifications** — In-app activity alerts for assignments, comments, team/project membership, requests, and HR updates.
- **Audit Log** — Append-only admin ledger of mutations with filters and Super Admin retention pruning.
- **Settings** — Office geofence/hours configuration, holiday calendar & Google ICS import, leave types, and access presets.

---

## Pages & API Routes

### App Pages (`app/`)
| Route | Page | Who Can Access |
| --- | --- | --- |
| `/` | Dashboard | Any signed-in active employee |
| `/announcements` | Announcements | Everyone (create/edit/delete requires `announcement:manage`) |
| `/tasks` | Tasks (Kanban & List) | Everyone (scoped by involvement unless `task:update`) |
| `/tasks/my` | My Tasks | Any signed-in active employee |
| `/tasks/new` | New Task | Anyone for General tasks; `task:create` for project tasks |
| `/tasks/[id]` | Task Detail & Comments | Involved users or `task:update` |
| `/tasks/[id]/edit` | Edit Task | Creator, assignee, or `task:update` |
| `/projects` | Projects | Everyone (sees own/member projects, or all with `project:update`) |
| `/projects/new` | New Project | `project:create` |
| `/projects/[id]` | Project Detail | Project members, lead, team lead, or `project:update` |
| `/teams` | Teams | Everyone (sees own teams, or all with `team:update`) |
| `/teams/[id]` | Team Detail | Team members/lead or `team:update` |
| `/employees` | Organization Members | Everyone (detailed actions gated by `employee:*`) |
| `/employees/[id]` | Member Profile | `employee:view-all` (redirects otherwise) |
| `/records` | Employment Records | `employee:view-all` |
| `/attendance` | My Attendance | `ADMIN` and `MEMBER` (`SUPER_ADMIN` sees empty state + Team link) |
| `/attendance/team` | Team Attendance (Month) | `attendance:view-all` or Team Leads |
| `/attendance/today` | Team Day View | `attendance:view-all` or Team Leads |
| `/leave` | Leave Balances & Requests | `ADMIN` and `MEMBER` (`SUPER_ADMIN` not tracked) |
| `/approvals` | Approvals Inbox | Team Leads or `leave:approve` |
| `/notifications` | Notifications | Any signed-in active employee |
| `/audit` | Audit Log | `ADMIN` and `SUPER_ADMIN` (pruning: `SUPER_ADMIN` only) |
| `/settings` | Settings | `ADMIN` / `SUPER_ADMIN` (full), or `leave:manage` (calendar & leave types) |
| `/sign-in`, `/sign-up` | Clerk Auth | Public |

### API Routes (`app/api/`)
| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/webhooks` | Clerk webhook signature | Syncs `user.created`, `user.updated`, `user.deleted` for invited employees |
| `POST /api/attendance/punch` | `ATTENDANCE_API_KEY` (`Bearer` / `x-api-key`) | External `CHECK_IN`, `CHECK_OUT`, or `AUTO` punch with custom timestamp & `lat`/`lng` |
| `GET /api/attendance/export?month=YYYY-MM[&team=...]` | Clerk session + `attendance:export` | Downloads 3-sheet Excel workbook (`Summary`, `Daily`, `Detail`) |
| `GET /api/leave/export` | Clerk session + `attendance:export` | Downloads leave balances and request history Excel workbook |

---

## Roles & Permissions

### Total Roles (3)
1. **`SUPER_ADMIN`** — Full system access; can manage `ADMIN`s and other `SUPER_ADMIN`s, assign roles, and prune audit history. **Not tracked** in attendance or leave.
2. **`ADMIN`** — Holds all 21 permissions automatically; can manage `MEMBER`s and access presets. **Cannot** change roles, edit/offboard/adjust another `ADMIN` or `SUPER_ADMIN`, or prune audit logs. **Is tracked** in attendance and leave.
3. **`MEMBER`** — Starts with **zero** permissions by default. Gains powers through:
   - **Access Presets** (named reusable permission bundles like `"HR"`)
   - **Personal Grants** (`EmployeePermission`, company-wide or scoped to one project, with optional `expiresAt`)
   - **Contextual Lead Privileges** (being `leadId` of a Team or Project)

### All Permissions (21)
| Group | Permission ID | What It Grants |
| --- | --- | --- |
| **Tasks** | `task:create` | Create tasks in any project |
| | `task:update` | Edit any task (and see General tasks) |
| | `task:delete` | Delete any task |
| | `task:assign` | Assign any task (including outside project / all active staff on General tasks) |
| **Projects** | `project:create` | Create projects |
| | `project:update` | Edit any project & members, and view org-wide dashboard metrics |
| | `project:delete` | Delete projects |
| **Teams** | `team:create` | Create teams |
| | `team:update` | Edit any team & members |
| | `team:delete` | Delete teams |
| **People** | `employee:view-all` | View full member profiles and `/records` |
| | `employee:create` | Invite / add employees |
| | `employee:update` | Edit profiles, generate Panthar/KavachX codes, promotions/transfers, toggle `flexibleWfh` |
| | `employee:offboard` | Offboard active employees |
| | `employee:delete` | Delete employees who never joined (`pending_*` Clerk ID) |
| **Attendance** | `attendance:view-all` | View everyone's attendance |
| | `attendance:edit` | Directly edit others' attendance days |
| | `attendance:export` | Export attendance and leave Excel files |
| **Leave** | `leave:approve` | Approve/reject anyone's Leave, WFH, Late Arrival and Time Correction requests |
| | `leave:manage` | Manage holidays, calendar overrides, leave types, and HR leave balance adjustments |
| **Company** | `announcement:manage` | Create, edit, and delete announcements |

- **Project-Scoped Permissions:** `task:create`, `task:update`, `task:delete`, `task:assign`, `project:update` can be granted for a single project (`projectId` set) instead of globally.
- **Lead Contextual Privileges:** A Project Lead (or the Lead of the Team owning that project) automatically gets those 5 project-scoped powers for that project.
- **Hierarchy & Self-Protection Rules (`lib/access.ts`):**
  - `canActOnEmployee(actorRole, targetRole)`: Anyone with the right permission can act on a `MEMBER`; **only `SUPER_ADMIN`** can act on an `ADMIN` or `SUPER_ADMIN`.
  - Users **cannot** change their own role, access presets/grants, `flexibleWfh`, attendance edits, leave balance adjustments, or approve/review their own requests.

---

## People, Auth, Codes & Offboarding Rules

### Invite-Only Authentication
- `proxy.ts` protects all routes except `/sign-in`, `/sign-up`, `/api/webhooks`, `/api/attendance/punch`, and `/manifest.json`.
- **JIT Sync (`lib/auth.ts`):** Signing up via Clerk without a pre-provisioned `Employee` record (matched by **verified primary email**) is rejected with `INVITATION_REQUIRED`—there is no open self-registration or auto-admin bootstrap.
- **`INACTIVE` users:** Blocked immediately by `getCurrentEmployee()` and `/api/attendance/punch`.
- **Viewing invite links:** Only `SUPER_ADMIN` can fetch an `ADMIN`'s pending Clerk invitation link.

### Employee Codes (`PANTHAR` & `KAVACHX`)
- Format: `PTHUB-<DDMMYY><seq>` and `KAVACHX-<DDMMYY><seq>` generated atomically inside a Prisma transaction using `Sequence` counters (`SEQ_PANTHAR`, `SEQ_KAVACHX`). Each code can only be generated once per employee.

### Employment Lifecycle
- **Statuses:** `ACTIVE`, `ON_LEAVE`, `INACTIVE`. **Employment types:** `FULL_TIME`, `INTERN`, `CONTRACT`.
- **Promotions, Transfers & Title Changes (`transitionRoleAction`):**
  - Only `ACTIVE` employees can transition. Effective `startDate` cannot precede `joinDate` or the current open `EmploymentRecord.startDate`.
  - Prevents leaving a team if the employee is still that team's `leadId`.
  - Closes the active `EmploymentRecord` (`endDate = startDate`), opens a new entry (`PROMOTION`, `TRANSFER`, or `TITLE_CHANGE`), updates team memberships, notifies the employee, and audits.
- **Delete vs. Offboard:**
  - `deleteEmployeeAction` only deletes users whose `clerkId` starts with `pending_` (never signed in) and who lead no teams/projects.
  - Anyone who has signed in must be **offboarded** (`offboardEmployeeAction`), which:
    1. Blocks if they still lead an unarchived project or any team.
    2. Closes current `EmploymentRecord` and appends an `EXITED` record.
    3. Cancels `PENDING` requests and any `APPROVED` requests starting after their last day.
    4. Optionally unassigns open tasks (re-assigning ownership to the next assignee or `null`).
    5. Marks `status: INACTIVE`, sets `exitDate`, clears all `TeamMembership` and `ProjectMember` rows, and deletes/revokes their Clerk user/invite.
- **Rehire:** Re-creating an `INACTIVE` employee reactivates their record (`status: ACTIVE`, `exitDate: null`), preserves their original `joinDate`, and logs a `REHIRED` `EmploymentRecord`.

---

## Teams, Projects, Tasks & Comments Rules

### Teams & Projects
- **Team Lead:** Always remains a member of the team (`manageTeamMembersAction` keeps `leadId` in `memberships`; updating `leadId` upserts membership). Teams with existing projects cannot be deleted.
- **Project Keys (`lib/tasks/keys.ts`):** `2–6` uppercase alphanumeric characters starting with a letter (e.g., `JNV`), auto-suggested from project name if omitted. Changing a project's key updates how all its task IDs display (`<KEY>-<number>`).
- **Project Progress:** Computed dynamically as `completedTasks / totalTasks` (excluding `CANCELLED`).

### Tasks, Subtasks & Blockers
- **Task IDs:** `<PROJECT_KEY>-<number>` via atomic `Project.taskCounter`, or `GEN-<number>` via `TaskSequence` for General tasks (`projectId: null`).
- **General Tasks:** Any user can create a General task; visible only to creator, assignees, admins, and `task:update` holders.
- **Visibility & Editing:**
  - Moving a task to `DONE` requires `completionNote` of **at least 10 characters** (`DONE_NOTE_MIN`) and **zero open subtasks**. Moving to `DONE` automatically clears `blockedById` on any tasks it was blocking.
  - Reordering a `DONE` task preserves its original `completedAt` and `completionNote`; moving out of `DONE` clears them (audit retains `previousDoneNote`).
  - **Subtasks:** Maximum depth of **1** (subtasks cannot have subtasks). Cannot be added to `DONE` or `CANCELLED` parents. Subtask `dueDate` cannot exceed parent's `dueDate`. Without `task:create`, involved members can only assign a new subtask to themselves.
  - **Assignees & Owner:** Every task has at most one `ownerId` (automatically added as an assignee; defaults to first assignee). Only project members, project lead, owning team's members/lead can be assigned unless the caller has `task:assign`/`task:update` and passes `outside: true`.
  - **Blockers:** Blocker must belong to the same project; self-blocking and circular dependency chains (checked up to 50 hops) are rejected.
  - **Cancel & Restore:** Requires `task:update`, creator, or owner, plus a reason (`>= 3` chars). Cancelling cascades to open subtasks and clears downstream `blockedById`. Restoring a subtask requires its parent to be open.
  - **Bulk Actions:** Up to `200` tasks per call (`bulkUpdateTasksAction`); per-task permission failures are skipped and counted without failing valid updates.
- **Comments:** Viewers/commenters must be involved or hold `task:update` (`1–5000` chars). Only the author can edit their comment (sets `editedAt`).

---

## Attendance, Geofencing & External API

### Office Settings & Calendar Precedence
- Each office defines `timezone` (default `Asia/Kolkata`), `workStart` (`10:00`), `workEnd` (`19:00`), `lateAfter` (`11:00`), `lateOutcome` (`HALF_DAY` or `LATE`), optional `minFullDayMinutes` (`30–960`), `radiusMeters` (`100` m, valid `20–5000`), and 7-day `weekPattern` (`OFFICE`, `WFH`, `OFF`).
- **Day kind precedence:** Office-specific `CalendarDay` → Company-wide `CalendarDay` → `weekPattern[weekday]`.
- **Coverage precedence:** Approved `LEAVE` beats `WFH`; approved `WFH` turns an `OFFICE` day into `WFH`.
- **Tracking bounds:** First tracked day = `max(joinDate, ATTENDANCE_START_DATE)`. Days before tracking starts or after `exitDate` show blank (`null`).

### Clock-In & Geofencing
- **Dashboard (`clockInAction`):** Reads browser GPS (`MAX_LOCATION_ACCURACY_M = 200` m). Rejects `"missing"`, `"imprecise"` (`accuracy > 200` m), or `"outside"` (`haversineDistance > office.radiusMeters`).
- **External API (`POST /api/attendance/punch`):**
  - Authenticated via `ATTENDANCE_API_KEY` (`Authorization: Bearer <key>` or `x-api-key`) with constant-time comparison.
  - Resolves employee by `employeeId`/`id`, `email`, `kavachXCode`, or `pantharCode` (rejects `INACTIVE` and `SUPER_ADMIN`).
  - Accepts `action` (`CHECK_IN`, `CHECK_OUT`, or `AUTO`), optional `timestamp`, and `lat`/`lng` (top-level or inside `location`).
  - Validates `lat`/`lng` strictly against `office.radiusMeters` (ignores `accuracy`). Writes no `AuditLog` and no extra `AttendanceEvent.note`.

### Day-Type Decision at Clock-In (`clockInKind`)
| Condition | Outcome |
| --- | --- |
| Day is `WFH`, `HOLIDAY`, or `OFF` | Allowed anywhere with that `dayKind` |
| `OFFICE` day + Approved `WFH` | Allowed anywhere as `WFH` |
| `OFFICE` day + Inside office radius | Allowed as `OFFICE` |
| `OFFICE` day + Outside/no GPS + `flexibleWfh: true` | Allowed as `WFH` (no request required) |
| `OFFICE` day + Outside/no GPS + Pending `WFH` request | Allowed provisionally as `WFH` (`awaitingWfh: true`) |
| `OFFICE` day + Outside/no GPS + no WFH | Blocked (UI offers inline "Request WFH for Today") |

### Clock-In Edge Cases
- **Approved full-day leave:** Clock-in blocked until leave is cancelled.
- **Approved half-day leave:** Allowed; immediately `HALF_DAY`, `isLate: false`, `reviewStatus: null`.
- **Same-day re-entry (after clocking out):** Blocked — one clock-in and one clock-out per day (app and punch API). A wrong clock-out is fixed with a Time Correction.
- **Approved Late Arrival for the day:** A late clock-in up to `arriveBy + graceMinutes` (or any time, if asked after the day) takes the approver's choice (`PRESENT` with `lateExcused`, or `LATE`) instead of `HALF_DAY`, and the day is locked (`reviewStatus: APPROVED`).
- **Open session from an earlier day:** Automatically closes the previous day as `missedCheckout: true` (no hours) and proceeds with today's clock-in.

### Lateness
- Late means clocking in after `lateAfter + graceMinutes` (`lateCutoffMinutes`; 11:00 + 15 → late from 11:16). Grace is an office setting and isn't shown to employees.
  - `OFFICE` (`lateOutcome = HALF_DAY`) → `HALF_DAY`, `isLate: true`. **Final** unless the person sends a Late Arrival request; nothing goes to Approvals on its own.
  - `OFFICE` (`lateOutcome = LATE`) → `LATE`, `isLate: true`.
  - `WFH` → `WFH`, `isLate: true` (never cut to `HALF_DAY`).
  - `OFF` / `HOLIDAY` → `PRESENT`, `isLate: false`.
- **Excused lateness:** An approved `WFH` with `excuseLate: true`, or an approved Late Arrival as Present, sets `lateExcused: true`, `isLate: false`. Decided days keep their status at clock-out.
- **Older half-day reviews (`reviewAttendanceAction`):** Days marked `reviewStatus: PENDING` before Late Arrival requests still show under "Half day review (older)": `MAKE_FULL_DAY` → `PRESENT` with `lateExcused`; `KEEP_HALF_DAY` → stays `HALF_DAY`.

### Clock-Out, Short Days, Early Leave & Overtime
- **Location-free:** Clock-out works from anywhere (no geofence check).
- **Midnight cutoff:** If an open session is from a prior date (`sessionDate < today`), checkout is rejected and the prior day closes as `missedCheckout: true` (fixed with a Time Correction).
- **Chronological guard:** `checkOutAt` must be strictly after `checkInAt`.
- **Short-day rule:** On `OFFICE` days with `minFullDayMinutes` set (unless half-day leave or already reviewed), `workMinutes < minFullDayMinutes` converts status to `HALF_DAY`.
- **Overtime & Left Early (`fullDay = max(0, workEnd - workStart)`):**
  - **`OFF` / `HOLIDAY`:** Every worked minute `> 0` is `overtimeMinutes`; `leftEarly` is always `false`.
  - **`OFFICE` / `WFH`:** `overtimeMinutes = max(0, workMinutes - fullDay)`. `leftEarly = true` only when `checkOutMinutes < workEndMinutes` **and** `workMinutes < fullDay` (forced `false` on half-day leave).

### Direct Admin Attendance Edits (`editAttendanceDayAction`)
- Requires `attendance:edit`; cannot edit self; only `SUPER_ADMIN` can edit `ADMIN`; cannot edit future dates or full-day approved leave; requires reason (`>= 3` chars).
- Allowed statuses: `PRESENT`, `LATE`, `HALF_DAY`, `WFH`, `ABSENT`. Writes `ADMIN_FIX` event, notifies employee, and logs `AuditLog`.

---

## Leave, WFH, Late Arrivals, Time Corrections & Approvals

The full attendance rules for admins and HR are in [`docs/attendance-rules.md`](docs/attendance-rules.md); known misuse risks and the plan for them are in [`docs/attendance-misuse-plan.md`](docs/attendance-misuse-plan.md).

### Leave Policy & Balance Rules
- **Leave year:** `January 1 – December 31` (`LEAVE_TRACKING_START = "2026-01-01"`). Unused days **never carry over**.
- **Proration:** From `startKey = max(joinDate, LEAVE_TRACKING_START)`:
  - `startYear < year` → full `yearlyDays`
  - `startYear === year` → `Math.floor(((yearlyDays * (13 - startMonth)) / 12) * 2) / 2` (rounded down to `0.5` steps)
- **Available days:** `allowed + adjusted - used - pending`. Unlimited leave types (`yearlyDays: null`) have no balance row or cap.
- **Re-sync triggers:** Adding/removing holidays, changing `weekPattern`, or updating leave types automatically triggers `recomputeRequestDays` and `recalculateBalances`.
- **HR Adjustments (`adjustBalanceAction`):** Requires `leave:manage`, `0.5`-day increments (`±365`), reason `>= 3` chars, cannot adjust self, cannot push available balance below `0`.

### Request Rules (`MAX_REQUEST_SPAN_DAYS = 60`, `reason` 3–1000 chars)
- **`LEAVE`:** Counts `OFFICE` + `WFH` days (excludes `OFF`/`HOLIDAY`). Cannot cross Dec 31. Half-day (`0.5`) must be a single date. Full-day leave cannot cover days already clocked in. Cannot overlap existing `PENDING`/`APPROVED` `LEAVE` or `WFH`.
- **`WFH`:** Counts `OFFICE` days only (`> 0`). Approving/rejecting settles any provisional `awaitingWfh` clock-ins (`WFH` vs `ABSENT`).
- **`ATTENDANCE_FIX` (shown as Time Correction / "Correct My Time"):** Single date, today or up to **31 days** back. `fixCheckIn` always; `fixCheckOut` required for a past day, optional for today (still working: the day stays open and they clock out as usual). Times can't be later than now; a fix identical to what's recorded is refused. `workMode` `OFFICE`/`WFH`. Blocked on approved full-day leave or an overlapping fix. **Approving:** the approver picks the status (`PRESENT`/`LATE`/`HALF_DAY`, or `WFH`/`WFH, Late`/`HALF_DAY` on WFH days); the rules' suggestion is preselected. With no clock-out in the fix, a recorded clock-out after the new clock-in is kept; a past day with none closes as a missed checkout.
- **`LATE_ARRIVAL`:** "I was / will be late." A working day from 31 days before to 31 days after today; refused on leave days, days they weren't late, or past days with no clock-in. Asked before clocking in, `arriveBy` is required (after the late cut-off, before office end). **Approving:** the approver picks `PRESENT` (late excused) or `LATE`; the clock-in time never changes. A clock-in later than `arriveBy + graceMinutes` isn't covered (normal rules apply; they may send a new request).

### Approvers, Cancel & Undo
- **Approvers:** Team leads of the requester's teams + active `MEMBER`s with global `leave:approve` (or active `ADMIN`/`SUPER_ADMIN`s if none). **Nobody can decide or review their own request.**
- **Cancel:** Requester can cancel `PENDING` requests or `APPROVED` requests with `startDate > today` (unless `PENDING` `WFH` already has `awaitingWfh` clock-ins).
- **Undo:** Approvers can reopen `APPROVED`/`REJECTED` `LEAVE` or `WFH` requests back to `PENDING` with a reason (`>= 3` chars). Approved `ATTENDANCE_FIX`, and an approved `LATE_ARRIVAL` on a day already clocked in, cannot be undone (use direct admin edit).

---

## Announcements, Notifications & Audit Log

- **Announcements:** Title (`<= 120` chars), body (`<= 4000` chars), optional `teamIds` (empty = company-wide), `pinned`, optional `expiresOn` (visible through end of that day IST). Sends in-app notifications & emails on creation.
- **Notifications:** Generated for task assignments, ownership changes, comments, team/project additions, employment transitions, flexible-WFH toggles, announcements, request submissions/decisions/undos, admin attendance edits, half-day reviews, and HR leave balance adjustments.
- **Audit Log (`/audit`):** Append-only ledger written asynchronously via `after()` (`Task`, `Project`, `Team`, `Employee`, `AccessPreset`, `EmployeePermission`, `Comment`, `Office`, `CalendarDay`, `LeaveType`, `Request`, `LeaveBalance`, `Announcement`, `Attendance`, `AuditLog`). Only `SUPER_ADMIN` can prune entries, keeping at least **6 months** (`pruneAuditLogAction`, default `12` months).

---

## Cron-Less Time Automation

The application uses **zero background cron jobs**. Every time-dependent transition runs lazily at read or write time:
- **Yearly leave reset:** `ensureBalances` creates new `LeaveBalance` rows for the new `year` on first access/request/adjustment.
- **Midnight missed checkouts:** `presentRow` flags expired sessions immediately on read; `recordClockIn` / `recordClockOut` persist `missedCheckout: true` on the next punch.
- **Past `ABSENT` days:** `emptyStatus` / `statusForEmptyDay` compute `ABSENT` dynamically for past working days without attendance rows or coverage.
- **Permission & announcement expiry:** `activeGrants` filters `expiresAt > Date.now()` and `getAnnouncements` filters `expiresAt > now`.
- **Overdue tasks & project health:** Evaluated dynamically against `now` / `today` in dashboard, project, and team queries.

---

## Local Development & Scripts

### Environment Variables
See [`.env.example`](.env.example):
- `DATABASE_URL` / `DIRECT_URL` — PostgreSQL (Neon) connection strings
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` — Clerk authentication & webhook verification
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, redirect URLs
- `ATTENDANCE_API_KEY` — Bearer / `x-api-key` secret for `POST /api/attendance/punch`
- `ATTENDANCE_START_DATE` *(optional)* — `YYYY-MM-DD` start of attendance tracking (defaults to `2026-12-01`)

### Commands
```bash
npm install          # Install dependencies & generate Prisma client (postinstall)
npm run dev          # Start Next.js dev server (Turbopack)
npm run build        # prisma generate && prisma migrate deploy && next build
npm run test         # Run unit tests (tsx --test tests/*.test.ts)
npm run lint         # Run ESLint
npm run db:studio    # Open Prisma Studio
```
