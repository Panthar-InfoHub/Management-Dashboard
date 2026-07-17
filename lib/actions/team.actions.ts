"use server";

import { db } from "@/lib/db";
import { requireAuth, getCurrentEmployee, checkPermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createTeamAction(data: {
  name: string;
  description?: string;
  color?: string;
  leadId: string;
}) {
  const employee = await requireAuth("team:create"); // Require proper permission

  const team = await db.team.create({
    data: {
      name: data.name,
      description: data.description,
      color: data.color,
      leadId: data.leadId,
      members: {
        connect: [{ id: data.leadId }] // Lead is automatically a member
      }
    }
  });

  revalidatePath("/teams");
  return team;
}
export async function updateTeamAction(teamId: string, data: {
  name: string;
  description?: string;
  color?: string;
  leadId: string;
}) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("team:update");

  const existing = await db.team.findUnique({ where: { id: teamId } });
  if (!existing) throw new Error("Team not found");
  if (!hasGlobalPerm && existing.leadId !== employee.id) {
    throw new Error("You do not have permission for this action.");
  }

  const team = await db.team.update({
    where: { id: teamId },
    data: {
      name: data.name,
      description: data.description,
      color: data.color,
      leadId: data.leadId,
    }
  });

  revalidatePath("/teams");
  revalidatePath(`/teams/${teamId}`);
  return team;
}

export async function manageTeamMembersAction(teamId: string, memberIds: string[]) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("team:update");

  const existing = await db.team.findUnique({ where: { id: teamId } });
  if (!existing) throw new Error("Team not found");
  if (!hasGlobalPerm && existing.leadId !== employee.id) {
    throw new Error("You do not have permission for this action.");
  }

  // Since prisma `set` replaces all relations, this is a clean sync
  const team = await db.team.update({
    where: { id: teamId },
    data: {
      members: {
        set: memberIds.map(id => ({ id }))
      }
    }
  });

  revalidatePath("/teams");
  revalidatePath(`/teams/${teamId}`);
  return team;
}

export async function deleteTeamAction(teamId: string) {
  const employee = await requireAuth("team:delete");

  const existing = await db.team.findUnique({ where: { id: teamId } });
  if (!existing) throw new Error("Team not found");

  try {
    await db.team.delete({
      where: { id: teamId }
    });
  } catch (error: any) {
    if (error.code === 'P2003') {
      throw new Error("Cannot delete this team because it still has active projects. Please delete or reassign all projects first.");
    }
    throw error;
  }

  revalidatePath("/teams");
  return true;
}
