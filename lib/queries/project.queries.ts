import { Prisma } from "@/lib/generated/prisma";
import { UserError } from "@/lib/errors";
import { computeProgress } from "@/lib/projects/progress";
import { db } from "@/lib/db";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";

export async function getProjectsList() {
  const employee = await getCurrentEmployee();

  const canViewAll = await checkPermission("project:update");
  
  // Fetch all projects where the employee is explicitly a member or the project lead (Admins/Managers see all)
  const whereClause = canViewAll ? {} : {
    OR: [
      { members: { some: { employeeId: employee.id } } },
      { leadId: employee.id }
    ]
  };

  const projects = await db.project.findMany({
    where: whereClause,
    include: {
      team: { select: { id: true, name: true } },
      lead: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      members: {
        include: { employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } }
      },
    },
    orderBy: { updatedAt: "desc" }
  });

  // Task counts for every project in one grouped query (not every task row).
  const now = new Date();
  const ids = projects.map((p) => p.id);
  const counts = ids.length
    ? await db.$queryRaw<{ projectId: string; total: number; done: number; open: number; overdue: number }[]>`
        SELECT t."projectId",
          COUNT(*) FILTER (WHERE t.status <> 'CANCELLED')::int AS total,
          COUNT(*) FILTER (WHERE t.status = 'DONE')::int AS done,
          COUNT(*) FILTER (WHERE t.status::text IN ('TODO','IN_PROGRESS','REVIEW','TESTING'))::int AS open,
          COUNT(*) FILTER (WHERE t.status::text IN ('TODO','IN_PROGRESS','REVIEW','TESTING') AND t."dueDate" < ${now})::int AS overdue
        FROM "Task" t WHERE t."projectId" IN (${Prisma.join(ids)}) GROUP BY t."projectId"`
    : [];
  const byId = new Map(counts.map((c) => [c.projectId, c]));

  return projects.map((p) => {
    const c = byId.get(p.id);
    const totalTasks = Number(c?.total ?? 0);
    const completedTasks = Number(c?.done ?? 0);
    return {
      ...p,
      totalTasks,
      completedTasks,
      openTasks: Number(c?.open ?? 0),
      overdueTasks: Number(c?.overdue ?? 0),
      computedProgress: computeProgress(completedTasks, totalTasks),
    };
  });
}

export async function getProjectById(projectId: string) {
  const employee = await getCurrentEmployee();

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      team: true,
      lead: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      members: { 
        include: { employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } } } 
      },
      tasks: {
        include: {
          assignees: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { updatedAt: "desc" }
      },
      delegatedPerms: {
        select: { id: true, employeeId: true, permission: true, grantedBy: true }
      }
    }
  });

  if (!project) return null;

  // Verify access
  if (project.leadId !== employee.id && !(await checkPermission("project:update", project.id))) {
    const isMember = project.members.some(m => m.employeeId === employee.id);
    if (!isMember) {
      throw new UserError("FORBIDDEN: Requires higher permission level");
    }
  }

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter((t) => t.status === "DONE").length;
  const computedProgress = computeProgress(completedTasks, totalTasks);

  return {
    ...project,
    computedProgress
  };
}

export type ProjectDetail = NonNullable<Awaited<ReturnType<typeof getProjectById>>>;
export type ProjectMemberRow = ProjectDetail["members"][number];
export type ProjectTaskRow = ProjectDetail["tasks"][number];
