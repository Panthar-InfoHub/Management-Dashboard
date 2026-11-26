"use server";
import { UserError } from "@/lib/errors";

import { db } from "@/lib/db";
import { requireAuth, getCurrentEmployee, checkPermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
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
      memberships: { create: [{ employeeId: data.leadId }] }, // the lead is always a member
    }
  });

  audit({ actorId: employee.id, entity: "Team", entityId: team.id, action: "create", changes: { name: team.name } });
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
  if (!existing) throw new UserError("Team not found");
  if (!hasGlobalPerm && existing.leadId !== employee.id) {
    throw new UserError("You do not have permission for this action.");
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
  // A new lead is a member of the team they lead.
  await db.teamMembership.upsert({
    where: { teamId_employeeId: { teamId, employeeId: data.leadId } },
    create: { teamId, employeeId: data.leadId },
    update: {},
  });

  audit({ actorId: employee.id, entity: "Team", entityId: teamId, action: "update", changes: JSON.parse(JSON.stringify(data)) });
  revalidatePath("/teams");
  revalidatePath(`/teams/${teamId}`);
  return team;
}

/** Set who is in a team. Only this team changes; people keep their other teams. */
export async function manageTeamMembersAction(teamId: string, memberIds: string[]) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("team:update");

  const existing = await db.team.findUnique({ where: { id: teamId }, include: { memberships: { select: { employeeId: true } } } });
  if (!existing) throw new UserError("Team not found");
  if (!hasGlobalPerm && existing.leadId !== employee.id) {
    throw new UserError("You do not have permission for this action.");
  }

  const wanted = [...new Set([...memberIds, existing.leadId])]; // the lead always stays
  const before = existing.memberships.map((m) => m.employeeId);
  const added = wanted.filter((id) => !before.includes(id));
  const removed = before.filter((id) => !wanted.includes(id));

  await db.$transaction(async (tx) => {
    if (removed.length) await tx.teamMembership.deleteMany({ where: { teamId, employeeId: { in: removed } } });
    if (added.length) await tx.teamMembership.createMany({ data: added.map((employeeId) => ({ teamId, employeeId })), skipDuplicates: true });
  });

  if (added.length > 0) {
    await db.notification.createMany({
      data: added.filter((id) => id !== employee.id).map((id) => ({
        recipientId: id,
        type: "TEAM_ADDED",
        title: "Added to Team",
        message: `You have been added to the team: ${existing.name}`,
        actionUrl: `/teams/${teamId}`,
      })),
    });
  }

  audit({ actorId: employee.id, entity: "Team", entityId: teamId, action: "members", changes: { added, removed } });
  revalidatePath("/teams");
  revalidatePath(`/teams/${teamId}`);
  return existing;
}

export async function deleteTeamAction(teamId: string) {
  const employee = await requireAuth("team:delete");

  const existing = await db.team.findUnique({ where: { id: teamId } });
  if (!existing) throw new UserError("Team not found");

  try {
    await db.team.delete({
      where: { id: teamId }
    });
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "P2003") {
      throw new UserError("Cannot delete this team because it still has active projects. Please delete or reassign all projects first.");
    }
    throw error;
  }

  audit({ actorId: employee.id, entity: "Team", entityId: teamId, action: "delete" });
  revalidatePath("/teams");
  return true;
}
