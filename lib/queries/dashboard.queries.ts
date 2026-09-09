import { db } from "@/lib/db";
import type { AuthEmployee } from "@/lib/auth";
import type { Prisma, TaskStatus } from "@/lib/generated/prisma";
import { startOfWeek, startOfMonth, startOfDay, endOfDay, subDays, addDays, eachDayOfInterval, format } from "date-fns";
import { ROLE_ORDER, sortByOrder } from "@/lib/dashboard-colors";

const OPEN_TASK_STATUSES: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "TESTING"];

function isAdminOrManager(employee: AuthEmployee) {
  return employee.role === "ADMIN" || employee.role === "MANAGER";
}

function checkIsOverdue(date: Date | null | undefined, now: Date): boolean {
  if (!date) return false;
  // If stored as local midnight (18:30Z in IST or 00:00Z in UTC), the user selected a calendar day,
  // which does not expire until the end of that day (24 hours after the midnight timestamp)
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  if ((hours === 18 && minutes === 30) || (hours === 0 && minutes === 0)) {
    return new Date(date.getTime() + 24 * 60 * 60 * 1000) < now;
  }
  return date < now;
}

/** Role-aware overview: three compound blocks bundling related stats, so nothing needs a click to be understood. */
export async function getDashboardOverview(employee: AuthEmployee) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const weekEnd = addDays(now, 7);

  if (isAdminOrManager(employee)) {
    // Phase 2.1 Optimization: Consolidate 9 DB roundtrips into 1 raw SQL query
    const results = await db.$queryRaw<any[]>`
      SELECT 
        (SELECT COUNT(*) FROM "Project" WHERE status = 'ACTIVE') as "activeProjects",
        (SELECT COUNT(*) FROM "Project" WHERE status = 'PLANNING') as "planningProjects",
        (SELECT COUNT(*) FROM "Project" WHERE status = 'COMPLETED') as "completedProjects",
        (SELECT COUNT(*) FROM "Task" WHERE status IN ('BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'TESTING')) as "openTasks",
        (SELECT COUNT(*) FROM "Task" WHERE status != 'DONE' AND (CASE WHEN "dueDate"::time = '18:30:00'::time OR "dueDate"::time = '00:00:00'::time THEN "dueDate" + INTERVAL '1 day' ELSE "dueDate" END) < ${now}) as "overdueTasks",
        (SELECT COUNT(*) FROM "Task" WHERE status = 'DONE' AND "completedAt" >= ${weekStart}) as "completedThisWeek",
        (SELECT COUNT(*) FROM "Employee" WHERE status = 'ACTIVE') as "teamMembers",
        (SELECT COUNT(*) FROM "Team") as "teams",
        (SELECT COUNT(*) FROM "Employee" WHERE status = 'ACTIVE' AND role = 'INTERN') as "interns"
    `;

    const stats = results[0];

    return {
      isAdmin: true as const,
      projects: { 
        active: Number(stats.activeProjects), 
        planning: Number(stats.planningProjects), 
        completed: Number(stats.completedProjects) 
      },
      tasks: { 
        open: Number(stats.openTasks), 
        overdue: Number(stats.overdueTasks), 
        completedThisWeek: Number(stats.completedThisWeek) 
      },
      people: { 
        members: Number(stats.teamMembers), 
        teams: Number(stats.teams), 
        interns: Number(stats.interns) 
      },
    };
  }

  // Regular Employee Dashboard (7 queries into 1)
  const results = await db.$queryRaw<any[]>`
    SELECT
      (SELECT COUNT(*) FROM "Task" t 
       INNER JOIN "_TaskAssignees" ta ON t.id = ta."A" 
       WHERE ta."B" = ${employee.id} AND t.status != 'DONE') as "myOpenTasks",
      
      (SELECT COUNT(*) FROM "Task" t 
       INNER JOIN "_TaskAssignees" ta ON t.id = ta."A" 
       WHERE ta."B" = ${employee.id} AND t.status != 'DONE' 
         AND (CASE WHEN t."dueDate"::time = '18:30:00'::time OR t."dueDate"::time = '00:00:00'::time THEN t."dueDate" + INTERVAL '1 day' ELSE t."dueDate" END) >= ${now} 
         AND t."dueDate" <= ${weekEnd}) as "myDueThisWeek",
      
      (SELECT COUNT(*) FROM "Task" t 
       INNER JOIN "_TaskAssignees" ta ON t.id = ta."A" 
       WHERE ta."B" = ${employee.id} AND t.status != 'DONE' 
         AND (CASE WHEN t."dueDate"::time = '18:30:00'::time OR t."dueDate"::time = '00:00:00'::time THEN t."dueDate" + INTERVAL '1 day' ELSE t."dueDate" END) < ${now}) as "myOverdueTasks",
       
      (SELECT COUNT(*) FROM "Task" t 
       INNER JOIN "_TaskAssignees" ta ON t.id = ta."A" 
       WHERE ta."B" = ${employee.id} AND t.status = 'DONE' AND t."completedAt" >= ${weekStart}) as "myCompletedThisWeek",
       
      (SELECT COUNT(*) FROM "Task" t 
       INNER JOIN "_TaskAssignees" ta ON t.id = ta."A" 
       WHERE ta."B" = ${employee.id} AND t.status = 'DONE' AND t."completedAt" >= ${monthStart}) as "myCompletedThisMonth",
       
      (SELECT COUNT(*) FROM "Project" p 
       INNER JOIN "ProjectMember" pm ON p.id = pm."projectId" 
       WHERE pm."employeeId" = ${employee.id} AND p.status IN ('ACTIVE', 'PLANNING')) as "myActiveProjects",
       
      (SELECT COUNT(*) FROM "Project" WHERE "leadId" = ${employee.id} AND status IN ('ACTIVE', 'PLANNING')) as "myLeadProjects"
  `;
  
  const stats = results[0];

  return {
    isAdmin: false as const,
    tasks: { 
      open: Number(stats.myOpenTasks), 
      dueThisWeek: Number(stats.myDueThisWeek), 
      overdue: Number(stats.myOverdueTasks) 
    },
    completed: { 
      thisMonth: Number(stats.myCompletedThisMonth), 
      thisWeek: Number(stats.myCompletedThisWeek) 
    },
    projects: { 
      active: Number(stats.myActiveProjects), 
      leading: Number(stats.myLeadProjects), 
      designation: employee.designation ?? employee.role 
    },
  };
}

/** The tasks that most need eyes on them right now: org-wide for admins/managers, personal otherwise. */
export async function getTaskRadar(employee: AuthEmployee) {
  const admin = isAdminOrManager(employee);

  const now = new Date();
  const weekEnd = addDays(now, 7);

  const tasks = await db.task.findMany({
    where: admin
      ? { status: { not: "DONE" }, dueDate: { not: null, lte: weekEnd } }
      : { assignees: { some: { id: employee.id } }, status: { not: "DONE" }, dueDate: { not: null, lte: weekEnd } },
    include: {
      project: { select: { id: true, name: true } },
      assignees: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    take: 20,
  });

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    project: t.project,
    assignees: t.assignees,
    isOverdue: checkIsOverdue(t.dueDate, now),
  }));
}

/** Projects that need a decision: critical priority, past/imminent end date, or having overdue tasks. */
export async function getAttentionProjects(employee: AuthEmployee) {
  const admin = isAdminOrManager(employee);
  const now = new Date();
  const attentionEndThreshold = addDays(endOfDay(now), 1);

  const conditions: Prisma.ProjectWhereInput[] = [
    { status: { in: ["ACTIVE", "PLANNING"] } },
    {
      OR: [
        { priority: "CRITICAL" },
        { endDate: { lte: attentionEndThreshold } },
        { tasks: { some: { status: { not: "DONE" }, dueDate: { lt: now } } } },
      ],
    },
  ];
  if (!admin) {
    conditions.push({ OR: [{ members: { some: { employeeId: employee.id } } }, { leadId: employee.id }] });
  }

  const projects = await db.project.findMany({
    where: { AND: conditions },
    include: {
      team: { select: { name: true } },
      tasks: { select: { id: true, status: true, dueDate: true } },
    },
    orderBy: [{ priority: "desc" }, { endDate: "asc" }],
    take: 20,
  });

  return projects.map((p) => {
    const totalTasks = p.tasks.length;
    const completedTasks = p.tasks.filter((t) => t.status === "DONE").length;
    const computedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : p.progress;
    const overdueTasksCount = p.tasks.filter((t) => t.status !== "DONE" && checkIsOverdue(t.dueDate, now)).length;

    return {
      id: p.id,
      name: p.name,
      priority: p.priority,
      status: p.status,
      endDate: p.endDate,
      team: p.team,
      progress: computedProgress,
      totalTasks,
      completedTasks,
      overdueTasksCount,
      isOverdue: checkIsOverdue(p.endDate, now),
    };
  });
}

/** Active/planning projects, most recently updated first, with computed progress. */
export async function getDashboardProjectsSummary(employee: AuthEmployee) {
  const admin = isAdminOrManager(employee);

  const whereClause: Prisma.ProjectWhereInput = admin
    ? { status: { in: ["ACTIVE", "PLANNING"] } }
    : { members: { some: { employeeId: employee.id } }, status: { in: ["ACTIVE", "PLANNING"] } };

  const projects = await db.project.findMany({
    where: whereClause,
    include: {
      team: { select: { name: true } },
      lead: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      tasks: { select: { status: true } },
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 4,
  });

  return projects.map((p) => {
    const totalTasks = p.tasks.length;
    const completedTasks = p.tasks.filter((t) => t.status === "DONE").length;
    const computedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : p.progress;
    return { ...p, computedProgress };
  });
}

/** Daily completion vs creation velocity over the last 14 days — admins/managers only. */
export async function getCompletionTrend(employee: AuthEmployee) {
  if (!isAdminOrManager(employee)) return null;

  const now = new Date();
  const rangeStart = startOfDay(subDays(now, 13));

  const [completed, created] = await Promise.all([
    db.$queryRaw<{ date: Date, count: number }[]>`
      SELECT DATE("completedAt") as date, COUNT(*)::int as count 
      FROM "Task" 
      WHERE status = 'DONE' AND "completedAt" >= ${rangeStart} 
      GROUP BY DATE("completedAt")
    `,
    db.$queryRaw<{ date: Date, count: number }[]>`
      SELECT DATE("createdAt") as date, COUNT(*)::int as count 
      FROM "Task" 
      WHERE "createdAt" >= ${rangeStart} 
      GROUP BY DATE("createdAt")
    `
  ]);

  const days = eachDayOfInterval({ start: rangeStart, end: now });
  const completedCounts = new Map<string, number>(days.map((d) => [format(d, "yyyy-MM-dd"), 0]));
  const createdCounts = new Map<string, number>(days.map((d) => [format(d, "yyyy-MM-dd"), 0]));
  
  for (const row of completed) {
    if (!row.date) continue;
    const key = format(new Date(row.date), "yyyy-MM-dd");
    if (completedCounts.has(key)) completedCounts.set(key, Number(row.count));
  }

  for (const row of created) {
    if (!row.date) continue;
    const key = format(new Date(row.date), "yyyy-MM-dd");
    if (createdCounts.has(key)) createdCounts.set(key, Number(row.count));
  }

  return days.map((d) => ({
    date: format(d, "MMM d"),
    value: completedCounts.get(format(d, "yyyy-MM-dd")) ?? 0,
    created: createdCounts.get(format(d, "yyyy-MM-dd")) ?? 0,
  }));
}

/** Team workload + org composition — admins/managers only. */
export async function getDashboardChartsData(employee: AuthEmployee) {
  if (!isAdminOrManager(employee)) return null;

  const [roleGroups, teamWorkloadRows] = await Promise.all([
    db.employee.groupBy({ by: ["role"], _count: true, where: { status: "ACTIVE" } }),
    db.$queryRaw<{ name: string; value: number }[]>`
      SELECT tm.name, COUNT(t.id)::int as value
      FROM "Task" t
      JOIN "Project" p ON t."projectId" = p.id
      JOIN "Team" tm ON p."teamId" = tm.id
      WHERE t.status != 'DONE'
      GROUP BY tm.id, tm.name
      ORDER BY value DESC
      LIMIT 6
    `,
  ]);

  return {
    roles: sortByOrder(
      roleGroups.map((g) => ({ name: g.role, value: g._count })),
      ROLE_ORDER
    ),
    teamWorkload: teamWorkloadRows.map((r) => ({ name: r.name, value: Number(r.value) })),
  };
}
