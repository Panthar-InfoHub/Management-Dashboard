// Dashboard data. Every block is one or two aggregate queries (no per-row
// lookups), and the page loads independent blocks in parallel, each in its own
// Suspense boundary, so a slow block never holds up the rest.
import { cache } from "react";
import { db } from "@/lib/db";
import type { AuthEmployee } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma";
import { hasPermission } from "@/lib/permissions";
import { todayKey } from "@/lib/attendance/calendar";
import { getApproverScope } from "@/lib/leave/queries";
import { inAnyTeam } from "@/lib/teams/membership";

const TZ = "Asia/Kolkata";
const OPEN = ["TODO", "IN_PROGRESS", "REVIEW", "TESTING"] as const;

/** Org-wide view for admins and anyone who manages all projects; personal otherwise. */
export const isOrgView = cache((employee: AuthEmployee) => hasPermission(employee, "project:update"));

// Older due dates were saved as midnight; those count until the end of that day.
const dueEnd = Prisma.sql`(CASE WHEN t."dueDate"::time IN ('18:30:00'::time, '00:00:00'::time) THEN t."dueDate" + INTERVAL '1 day' ELSE t."dueDate" END)`;
const localDay = (col: Prisma.Sql) => Prisma.sql`DATE((${col} AT TIME ZONE 'UTC') AT TIME ZONE ${TZ})`;

/** Who a task query covers: everything, or tasks you're assigned to. */
function taskScope(employee: AuthEmployee, org: boolean) {
  return org ? Prisma.sql`TRUE` : Prisma.sql`EXISTS (SELECT 1 FROM "_TaskAssignees" ta WHERE ta."B" = t.id AND ta."A" = ${employee.id})`;
}

export type Kpis = Awaited<ReturnType<typeof getKpis>>;

/** Headline numbers, in one round trip. */
export async function getKpis(employee: AuthEmployee) {
  const org = await isOrgView(employee);
  const scope = taskScope(employee, org);
  const now = new Date();
  const [row] = await db.$queryRaw<Record<string, bigint | number>[]>`
    WITH bounds AS (
      SELECT date_trunc('week', (now() AT TIME ZONE ${TZ})) AT TIME ZONE ${TZ} AT TIME ZONE 'UTC' AS week_start
    )
    SELECT
      (SELECT COUNT(*) FROM "Task" t WHERE t.status::text IN ('TODO','IN_PROGRESS','REVIEW','TESTING') AND ${scope}) AS "open",
      (SELECT COUNT(*) FROM "Task" t WHERE t.status::text IN ('TODO','IN_PROGRESS','REVIEW','TESTING') AND t."dueDate" IS NOT NULL AND ${dueEnd} < ${now} AND ${scope}) AS "overdue",
      (SELECT COUNT(*) FROM "Task" t WHERE t.status::text IN ('TODO','IN_PROGRESS','REVIEW','TESTING') AND t."dueDate" IS NOT NULL AND ${dueEnd} >= ${now} AND t."dueDate" <= ${now}::timestamp + INTERVAL '7 days' AND ${scope}) AS "dueSoon",
      (SELECT COUNT(*) FROM "Task" t WHERE t.status = 'REVIEW' AND ${scope}) AS "inReview",
      (SELECT COUNT(*) FROM "Task" t, bounds b WHERE t.status = 'DONE' AND t."completedAt" >= b.week_start AND ${scope}) AS "doneThisWeek",
      (SELECT COUNT(*) FROM "Task" t, bounds b WHERE t.status = 'DONE' AND t."completedAt" >= b.week_start - INTERVAL '7 days' AND t."completedAt" < b.week_start AND ${scope}) AS "doneLastWeek",
      (SELECT COUNT(*) FROM "Project" p WHERE p.status = 'ACTIVE' AND (${org} OR p."leadId" = ${employee.id} OR EXISTS (SELECT 1 FROM "ProjectMember" pm WHERE pm."projectId" = p.id AND pm."employeeId" = ${employee.id}))) AS "activeProjects",
      (SELECT COUNT(*) FROM "Employee" e WHERE e.status = 'ACTIVE' AND e.role <> 'SUPER_ADMIN') AS "people"
  `;
  const n = (k: string) => Number(row?.[k] ?? 0);
  return {
    org,
    open: n("open"),
    overdue: n("overdue"),
    dueSoon: n("dueSoon"),
    inReview: n("inReview"),
    doneThisWeek: n("doneThisWeek"),
    doneLastWeek: n("doneLastWeek"),
    activeProjects: n("activeProjects"),
    people: n("people"),
  };
}

export type ThroughputPoint = { key: string; label: string; done: number; created: number };

/**
 * Completed vs created, per week for the last 12 weeks and per day for the
 * last 14 days (office time). Weekly is the default view: daily is mostly zeros
 * for a small team.
 */
export async function getThroughput(employee: AuthEmployee) {
  const org = await isOrgView(employee);
  const scope = taskScope(employee, org);
  const doneDay = localDay(Prisma.sql`t."completedAt"`);
  const createdDay = localDay(Prisma.sql`t."createdAt"`);
  const [weekly, daily] = await Promise.all([
    db.$queryRaw<{ day: Date; done: number; created: number }[]>`
      WITH weeks AS (
        SELECT generate_series(date_trunc('week', now() AT TIME ZONE ${TZ})::date - 77, date_trunc('week', now() AT TIME ZONE ${TZ})::date, INTERVAL '7 days')::date AS day
      )
      SELECT w.day,
        (SELECT COUNT(*)::int FROM "Task" t WHERE t.status = 'DONE' AND t."completedAt" IS NOT NULL AND ${doneDay} >= w.day AND ${doneDay} < w.day + 7 AND ${scope}) AS done,
        (SELECT COUNT(*)::int FROM "Task" t WHERE ${createdDay} >= w.day AND ${createdDay} < w.day + 7 AND ${scope}) AS created
      FROM weeks w ORDER BY w.day`,
    db.$queryRaw<{ day: Date; done: number; created: number }[]>`
      WITH days AS (
        SELECT generate_series(DATE(now() AT TIME ZONE ${TZ}) - 13, DATE(now() AT TIME ZONE ${TZ}), INTERVAL '1 day')::date AS day
      )
      SELECT d.day,
        (SELECT COUNT(*)::int FROM "Task" t WHERE t.status = 'DONE' AND t."completedAt" IS NOT NULL AND ${doneDay} = d.day AND ${scope}) AS done,
        (SELECT COUNT(*)::int FROM "Task" t WHERE ${createdDay} = d.day AND ${scope}) AS created
      FROM days d ORDER BY d.day`,
  ]);
  const shape = (rows: { day: Date; done: number; created: number }[], week: boolean): ThroughputPoint[] =>
    rows.map((r) => {
      const d = new Date(r.day);
      return {
        key: d.toISOString().slice(0, 10),
        label: week ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", timeZone: "UTC" }),
        done: Number(r.done),
        created: Number(r.created),
      };
    });
  return { weekly: shape(weekly, true), daily: shape(daily, false) };
}

/** Open work per workflow stage. */
export async function getStageBreakdown(employee: AuthEmployee) {
  const org = await isOrgView(employee);
  const groups = await db.task.groupBy({
    by: ["status"],
    where: { status: { in: [...OPEN] }, ...(org ? {} : { assignees: { some: { id: employee.id } } }) },
    _count: true,
  });
  return OPEN.map((s) => ({ status: s, count: groups.find((g) => g.status === s)?._count ?? 0 }));
}

/** Open and overdue tasks per Owner (top 8): who is carrying the work. */
export async function getWorkload(employee: AuthEmployee) {
  if (!(await isOrgView(employee))) return null;
  const now = new Date();
  const rows = await db.$queryRaw<{ id: string; firstName: string; lastName: string; open: number; overdue: number }[]>`
    SELECT e.id, e."firstName", e."lastName",
      COUNT(*)::int AS open,
      COUNT(*) FILTER (WHERE t."dueDate" IS NOT NULL AND ${dueEnd} < ${now})::int AS overdue
    FROM "Task" t JOIN "Employee" e ON e.id = t."ownerId"
    WHERE t.status::text IN ('TODO','IN_PROGRESS','REVIEW','TESTING')
    GROUP BY e.id ORDER BY open DESC, overdue DESC LIMIT 8
  `;
  return rows.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}`.trim(), open: Number(r.open), overdue: Number(r.overdue) }));
}

/** Overdue and due-in-7-days tasks, most urgent first. */
export async function getAttentionTasks(employee: AuthEmployee) {
  const org = await isOrgView(employee);
  const weekEnd = new Date(Date.now() + 7 * 86400000);
  const tasks = await db.task.findMany({
    where: {
      status: { in: [...OPEN] },
      dueDate: { not: null, lte: weekEnd },
      ...(org ? {} : { assignees: { some: { id: employee.id } } }),
    },
    select: {
      id: true, title: true, priority: true, status: true, dueDate: true, number: true, projectId: true,
      project: { select: { id: true, name: true, key: true } },
      owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    take: 8,
  });
  const today = todayKey(TZ);
  return tasks.map((t) => ({ ...t, overdue: !!t.dueDate && todayKey(TZ, t.dueDate) < today }));
}

export type Health = { state: "late" | "behind" | "soon" | "ok" | "empty" | "done"; label: string; reason: string };
const HEALTH_ORDER: Health["state"][] = ["late", "behind", "soon", "ok", "empty", "done"];

/** Active projects with progress, overdue counts and a plain-words health: two queries in all. */
export async function getProjectHealth(employee: AuthEmployee) {
  const org = await isOrgView(employee);
  const projects = await db.project.findMany({
    where: {
      status: { in: ["ACTIVE", "PLANNING"] },
      ...(org ? {} : { OR: [{ leadId: employee.id }, { members: { some: { employeeId: employee.id } } }] }),
    },
    select: { id: true, name: true, key: true, status: true, priority: true, endDate: true, lead: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: [{ updatedAt: "desc" }],
    take: 30,
  });
  if (projects.length === 0) return [];

  const now = new Date();
  const ids = projects.map((p) => p.id);
  const counts = await db.$queryRaw<{ projectId: string; total: number; done: number; overdue: number }[]>`
    SELECT t."projectId",
      COUNT(*) FILTER (WHERE t.status <> 'CANCELLED')::int AS total,
      COUNT(*) FILTER (WHERE t.status = 'DONE')::int AS done,
      COUNT(*) FILTER (WHERE t.status::text IN ('TODO','IN_PROGRESS','REVIEW','TESTING') AND t."dueDate" IS NOT NULL AND ${dueEnd} < ${now})::int AS overdue
    FROM "Task" t WHERE t."projectId" IN (${Prisma.join(ids)}) GROUP BY t."projectId"
  `;
  const byId = new Map(counts.map((c) => [c.projectId, c]));
  const today = todayKey(TZ);

  return projects
    .map((p) => {
      const c = byId.get(p.id);
      const total = Number(c?.total ?? 0);
      const done = Number(c?.done ?? 0);
      const overdue = Number(c?.overdue ?? 0);
      const open = total - done;
      const pastDeadline = !!p.endDate && todayKey(TZ, p.endDate) < today;
      const daysLeft = p.endDate ? Math.round((new Date(todayKey(TZ, p.endDate)).getTime() - new Date(today).getTime()) / 86400000) : null;
      const progress = total ? Math.round((done / total) * 100) : 0;
      // Only open work makes a project late: a finished project past its date is fine.
      const health: Health =
        total === 0 ? { state: "empty", label: "No Tasks Yet", reason: "Add tasks to track progress" }
        : open === 0 ? { state: "done", label: "All Done", reason: `${done} tasks finished` }
        : pastDeadline ? { state: "late", label: "Past Deadline", reason: `${open} open after ${Math.abs(daysLeft ?? 0)}d past the deadline` }
        : overdue > 0 ? { state: "behind", label: "Overdue Work", reason: `${overdue} task${overdue === 1 ? "" : "s"} past due` }
        : daysLeft !== null && daysLeft <= 7 && progress < 70 ? { state: "soon", label: "Deadline Soon", reason: `${daysLeft}d left, ${progress}% done` }
        : { state: "ok", label: "On Track", reason: daysLeft !== null ? `${daysLeft}d left` : "No deadline" };
      return { ...p, total, done, open, overdue, progress, pastDeadline, health };
    })
    .sort((a, b) => HEALTH_ORDER.indexOf(a.health.state) - HEALTH_ORDER.indexOf(b.health.state) || b.overdue - a.overdue)
    .slice(0, 6);
}

/** Requests waiting for you to decide (null when you can't approve anyone). */
export async function getPendingApprovals(employee: AuthEmployee) {
  const scope = await getApproverScope(employee);
  if (!scope) return null;
  const who = { id: { not: employee.id }, ...(scope.all ? {} : inAnyTeam(scope.teamIds)) };
  const groups = await db.request.groupBy({ by: ["kind"], where: { status: "PENDING", employee: who }, _count: true });
  const get = (k: string) => groups.find((g) => g.kind === k)?._count ?? 0;
  return { leave: get("LEAVE"), wfh: get("WFH"), fixes: get("ATTENDANCE_FIX"), total: groups.reduce((s, g) => s + g._count, 0) };
}
