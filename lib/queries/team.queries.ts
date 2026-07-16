import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";

export async function getTeams() {
  const employee = await getCurrentEmployee();
  
  // Everyone can view teams
  const teams = await db.team.findMany({
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

  return team;
}
