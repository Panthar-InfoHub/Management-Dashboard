import { Prisma } from "@/lib/generated/prisma";
import { UserError } from "@/lib/errors";
import { computeProgress } from "@/lib/projects/progress";
import { db } from "@/lib/db";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";

export async function getTeams() {
  const employee = await getCurrentEmployee();
  
  const canViewAll = await checkPermission("team:update");
  
  // Admin and Manager see all teams. Others see only teams they belong to or lead.
  const whereClause = canViewAll ? {} : {
    OR: [
      { memberships: { some: { employeeId: employee.id } } },
      { leadId: employee.id }
    ]
  };

  const teams = await db.team.findMany({
    where: whereClause,
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true }
      },
      memberships: { select: { employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, designation: true, email: true, status: true } } }, orderBy: { joinedAt: "asc" } },
      projects: {
        select: { id: true }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  // Open and overdue work per team in one grouped query.
  const now = new Date();
  const ids = teams.map((t) => t.id);
  const work = ids.length
    ? await db.$queryRaw<{ teamId: string; open: number; overdue: number; active: number }[]>`
        SELECT p."teamId",
          COUNT(t.id) FILTER (WHERE t.status::text IN ('TODO','IN_PROGRESS','REVIEW','TESTING'))::int AS open,
          COUNT(t.id) FILTER (WHERE t.status::text IN ('TODO','IN_PROGRESS','REVIEW','TESTING') AND t."dueDate" < ${now})::int AS overdue,
          COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'ACTIVE')::int AS active
        FROM "Project" p LEFT JOIN "Task" t ON t."projectId" = p.id
        WHERE p."teamId" IN (${Prisma.join(ids)})
        GROUP BY p."teamId"`
    : [];
  const byTeam = new Map(work.map((w) => [w.teamId, w]));

  return teams.map(({ memberships, ...team }) => ({
    ...team,
    members: memberships.map((m) => m.employee).filter((e) => e.status !== "INACTIVE"),
    openTasks: Number(byTeam.get(team.id)?.open ?? 0),
    overdueTasks: Number(byTeam.get(team.id)?.overdue ?? 0),
    activeProjects: Number(byTeam.get(team.id)?.active ?? 0),
  }));
}

export async function getTeamById(teamId: string) {
  const employee = await getCurrentEmployee();

  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, designation: true }
      },
      memberships: { select: { employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, designation: true, email: true, status: true } } }, orderBy: { joinedAt: "asc" } },
      projects: {
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { updatedAt: "desc" }
      }
    }
  });

  if (!team) return null;
  const members = team.memberships.map((m) => m.employee).filter((e) => e.status !== "INACTIVE");

  if (team.leadId !== employee.id && !(await checkPermission("team:update"))) {
    const isMember = members.some(m => m.id === employee.id);
    if (!isMember) {
      throw new UserError("FORBIDDEN: Requires higher permission level");
    }
  }

  // Progress per project from one grouped count, not every task row.
  const counts = team.projects.length
    ? await db.task.groupBy({ by: ["projectId", "status"], where: { projectId: { in: team.projects.map((p) => p.id) }, status: { not: "CANCELLED" } }, _count: true })
    : [];
  const tally = (projectId: string, done?: boolean) =>
    counts.filter((c) => c.projectId === projectId && (done === undefined || (c.status === "DONE") === done)).reduce((s, c) => s + c._count, 0);

  const { memberships: _memberships, ...rest } = team;
  return {
    ...rest,
    members,
    projects: team.projects.map((project) => {
      const total = tally(project.id);
      const done = tally(project.id, true);
      return { ...project, total, done, progress: computeProgress(done, total) };
    }),
  };
}

/** The team's latest-updated tasks for its page (projects owned by the team). */
export async function getTeamRecentTasks(teamId: string) {
  return db.task.findMany({
    where: { project: { teamId } },
    include: {
      assignees: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      project: { select: { name: true, id: true, key: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
}

export type TeamDetail = NonNullable<Awaited<ReturnType<typeof getTeamById>>>;
export type TeamRecentTask = Awaited<ReturnType<typeof getTeamRecentTasks>>[number];
