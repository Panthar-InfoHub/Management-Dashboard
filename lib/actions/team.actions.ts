"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
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
  await requireAuth("team:update"); // Use proper permission from permission-list

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
  await requireAuth("team:manage-members");

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
  // Assuming we use admin:manage or a specific team:delete
  await requireAuth("team:update"); 

  await db.team.delete({
    where: { id: teamId }
  });

  revalidatePath("/teams");
  return true;
}
