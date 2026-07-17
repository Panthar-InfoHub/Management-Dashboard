import { db } from "@/lib/db";
import type { AuthEmployee } from "@/lib/auth";
import type { Prisma, TaskStatus } from "@/lib/generated/prisma";
import { startOfWeek, startOfMonth, startOfDay, subDays, addDays, eachDayOfInterval, format } from "date-fns";
import { ROLE_ORDER, sortByOrder } from "@/lib/dashboard-colors";

const OPEN_TASK_STATUSES: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "TESTING"];

function isAdminOrManager(employee: AuthEmployee) {
  return employee.role === "ADMIN" || employee.role === "MANAGER";
}

/** Role-aware overview: three compound blocks bundling related stats, so nothing needs a click to be understood. */
export async function getDashboardOverview(employee: AuthEmployee) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const weekEnd = addDays(now, 7);

  if (isAdminOrManager(employee)) {
    const [activeProjects, planningProjects, completedProjects, openTasks, overdueTasks, completedThisWeek, teamMembers, teams, interns] =
      await Promise.all([
        db.project.count({ where: { status: "ACTIVE" } }),
        db.project.count({ where: { status: "PLANNING" } }),
        db.project.count({ where: { status: "COMPLETED" } }),
        db.task.count({ where: { status: { in: OPEN_TASK_STATUSES } } }),
        db.task.count({ where: { status: { not: "DONE" }, dueDate: { lt: now } } }),
        db.task.count({ where: { status: "DONE", completedAt: { gte: weekStart } } }),
        db.employee.count({ where: { status: "ACTIVE" } }),
        db.team.count(),
        db.employee.count({ where: { status: "ACTIVE", role: "INTERN" } }),
      ]);

    return {
      isAdmin: true as const,
      projects: { active: activeProjects, planning: planningProjects, completed: completedProjects },
      tasks: { open: openTasks, overdue: overdueTasks, completedThisWeek },
      people: { members: teamMembers, teams, interns },
    };
  }

  const [myOpenTasks, myDueThisWeek, myOverdueTasks, myCompletedThisWeek, myCompletedThisMonth, myActiveProjects, myLeadProjects] =
    await Promise.all([
      db.task.count({ where: { assignees: { some: { id: employee.id } }, status: { not: "DONE" } } }),
      db.task.count({
        where: { assignees: { some: { id: employee.id } }, status: { not: "DONE" }, dueDate: { gte: now, lte: weekEnd } },
      }),
      db.task.count({ where: { assignees: { some: { id: employee.id } }, status: { not: "DONE" }, dueDate: { lt: now } } }),
      db.task.count({ where: { assignees: { some: { id: employee.id } }, status: "DONE", completedAt: { gte: weekStart } } }),
      db.task.count({ where: { assignees: { some: { id: employee.id } }, status: "DONE", completedAt: { gte: monthStart } } }),
      db.project.count({ where: { members: { some: { employeeId: employee.id } }, status: { in: ["ACTIVE", "PLANNING"] } } }),
      db.project.count({ where: { leadId: employee.id, status: { in: ["ACTIVE", "PLANNING"] } } }),
    ]);

  return {
    isAdmin: false as const,
    tasks: { open: myOpenTasks, dueThisWeek: myDueThisWeek, overdue: myOverdueTasks },
    completed: { thisMonth: myCompletedThisMonth, thisWeek: myCompletedThisWeek },
    projects: { active: myActiveProjects, leading: myLeadProjects, designation: employee.designation ?? employee.role },
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
    isOverdue: t.dueDate ? t.dueDate < now : false,
  }));
}

/** Projects that need a decision: critical priority or past their end date. */
export async function getAttentionProjects(employee: AuthEmployee) {
  const admin = isAdminOrManager(employee);
  const now = new Date();

  const conditions: Prisma.ProjectWhereInput[] = [
    { status: { in: ["ACTIVE", "PLANNING"] } },
    { OR: [{ priority: "CRITICAL" }, { endDate: { lt: now } }] },
  ];
  if (!admin) {
    conditions.push({ OR: [{ members: { some: { employeeId: employee.id } } }, { leadId: employee.id }] });
  }

  const projects = await db.project.findMany({
    where: { AND: conditions },
    include: { team: { select: { name: true } } },
    orderBy: [{ priority: "desc" }, { endDate: "asc" }],
    take: 20,
  });

  return projects.map((p) => ({ ...p, isOverdue: p.endDate ? p.endDate < now : false }));
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

  const [roleGroups, openTasksByTeam] = await Promise.all([
    db.employee.groupBy({ by: ["role"], _count: true, where: { status: "ACTIVE" } }),
    db.task.findMany({
      where: { status: { not: "DONE" } },
      select: { project: { select: { team: { select: { id: true, name: true } } } } },
    }),
  ]);

  const workloadMap = new Map<string, { name: string; value: number }>();
  for (const t of openTasksByTeam) {
    const team = t.project.team;
    if (!team) continue;
    const entry = workloadMap.get(team.id) ?? { name: team.name, value: 0 };
    entry.value += 1;
    workloadMap.set(team.id, entry);
  }
  const teamWorkload = [...workloadMap.values()].sort((a, b) => b.value - a.value).slice(0, 6);

  return {
    roles: sortByOrder(
      roleGroups.map((g) => ({ name: g.role, value: g._count })),
      ROLE_ORDER
    ),
    teamWorkload,
  };
}
