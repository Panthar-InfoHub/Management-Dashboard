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

  return teams.map(({ memberships, ...team }) => ({ ...team, members: memberships.map((m) => m.employee).filter((e) => e.status !== "INACTIVE") }));
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
          tasks: { select: { status: true } }
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
      throw new Error("FORBIDDEN: Requires higher permission level");
    }
  }

  const { memberships: _memberships, ...rest } = team;
  return {
    ...rest,
    members,
    projects: team.projects.map(({ tasks, ...project }) => ({
      ...project,
      progress: computeProgress(tasks.filter((t) => t.status === "DONE").length, tasks.length),
    })),
  };
}
