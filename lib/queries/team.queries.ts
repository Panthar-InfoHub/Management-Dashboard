import { db } from "@/lib/db";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";

export async function getTeams() {
  const employee = await getCurrentEmployee();
  
  const canViewAll = await checkPermission("team:update");
  
  // Admin and Manager see all teams. Others see only teams they belong to or lead.
  const whereClause = canViewAll ? {} : {
    OR: [
      { members: { some: { id: employee.id } } },
      { leadId: employee.id }
    ]
  };

  const teams = await db.team.findMany({
    where: whereClause,
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true }
      },
      members: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, designation: true }
      },
      projects: {
        select: { id: true, name: true, status: true, progress: true }
      }
    },
    orderBy: {
      name: "asc"
    }
  });

  return teams;
}

export async function getTeamById(teamId: string) {
  const employee = await getCurrentEmployee();

  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      lead: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, designation: true }
      },
      members: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, designation: true }
      },
      projects: {
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }
        },
        orderBy: { updatedAt: "desc" }
      }
    }
  });

  if (!team) return null;

  if (employee.role !== "ADMIN" && employee.role !== "MANAGER" && team.leadId !== employee.id) {
    const isMember = team.members.some(m => m.id === employee.id);
    if (!isMember) {
      throw new Error("FORBIDDEN: Requires higher permission level");
    }
  }

  return team;
}
