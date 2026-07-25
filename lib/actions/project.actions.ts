"use server";

import { db } from "@/lib/db";
import { requireAuth, getCurrentEmployee, checkPermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { ProjectStatus, TaskPriority } from "@/lib/generated/prisma";

// ─── Validation Helpers ───

const VALID_PROJECT_STATUSES: ProjectStatus[] = ["PLANNING", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"];
const VALID_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function assertValidProjectStatus(value: unknown): asserts value is ProjectStatus {
  if (!VALID_PROJECT_STATUSES.includes(value as ProjectStatus)) {
    throw new Error(`Invalid project status: ${String(value)}`);
  }
}

function assertValidPriority(value: unknown): asserts value is TaskPriority {
  if (!VALID_PRIORITIES.includes(value as TaskPriority)) {
    throw new Error(`Invalid priority: ${String(value)}`);
  }
}

// ─── Actions ───

export async function updateProjectStatusAction(projectId: string, newStatus: string) {
  assertValidProjectStatus(newStatus);

  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("project:update");

  const existing = await db.project.findUnique({ where: { id: projectId } });
  if (!existing) throw new Error("Project not found");
  if (!hasGlobalPerm && existing.leadId !== employee.id) {
    throw new Error("You do not have permission for this action.");
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: { status: newStatus }
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");

  return { success: true, project };
}

export async function updateProjectPriorityAction(projectId: string, newPriority: string) {
  assertValidPriority(newPriority);

  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("project:update");

  const existing = await db.project.findUnique({ where: { id: projectId } });
  if (!existing) throw new Error("Project not found");
  if (!hasGlobalPerm && existing.leadId !== employee.id) {
    throw new Error("You do not have permission for this action.");
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: { priority: newPriority }
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);

  return { success: true, project };
}

export async function createProjectAction(data: {
  name: string;
  description?: string;
  leadId: string;
  teamId: string;
  status: string;
  priority: string;
  startDate?: Date;
  endDate?: Date;
  addTeamMembers?: boolean;
}) {
  const employee = await requireAuth("project:create");

  if (!data.name?.trim()) throw new Error("Project name is required.");
  if (!data.leadId?.trim()) throw new Error("Project lead is required.");
  if (!data.teamId?.trim()) throw new Error("Team is required.");
  assertValidProjectStatus(data.status);
  assertValidPriority(data.priority);

  let membersToAdd = [
    { employeeId: data.leadId },
    ...(data.leadId !== employee.id ? [{ employeeId: employee.id }] : [])
  ];

  if (data.addTeamMembers && data.teamId) {
    const team = await db.team.findUnique({
      where: { id: data.teamId },
      include: { members: { select: { id: true } } }
    });
    if (team) {
      team.members.forEach((m: { id: string }) => {
        if (!membersToAdd.find((x) => x.employeeId === m.id)) {
          membersToAdd.push({ employeeId: m.id });
        }
      });
    }
  }

  const project = await db.project.create({
    data: {
      name: data.name.trim(),
      description: data.description,
      leadId: data.leadId,
      teamId: data.teamId,
      status: data.status as ProjectStatus,
      priority: data.priority as TaskPriority,
      startDate: data.startDate,
      endDate: data.endDate,
      members: {
        create: membersToAdd
      }
    }
  });

  revalidatePath("/projects");
  revalidatePath("/");

  return { success: true, project };
}

export async function updateProjectAction(projectId: string, data: {
  name: string;
  description?: string;
  leadId: string;
  teamId: string;
  status: string;
  priority: string;
}) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("project:update");

  if (!data.name?.trim()) throw new Error("Project name is required.");
  assertValidProjectStatus(data.status);
  assertValidPriority(data.priority);

  const existing = await db.project.findUnique({ where: { id: projectId } });
  if (!existing) throw new Error("Project not found");
  if (!hasGlobalPerm && existing.leadId !== employee.id) {
    throw new Error("You do not have permission for this action.");
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      name: data.name.trim(),
      description: data.description,
      leadId: data.leadId,
      teamId: data.teamId,
      status: data.status as ProjectStatus,
      priority: data.priority as TaskPriority,
    }
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { success: true, project };
}

export async function manageProjectMembersAction(projectId: string, memberIds: string[]) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("project:update");

  if (!Array.isArray(memberIds)) throw new Error("Member IDs must be an array.");

  const existing = await db.project.findUnique({ 
    where: { id: projectId },
    include: { members: true }
  });
  if (!existing) throw new Error("Project not found");
  if (!hasGlobalPerm && existing.leadId !== employee.id) {
    throw new Error("You do not have permission for this action.");
  }

  // Sync ProjectMember relation (join table)
  await db.$transaction([
    db.projectMember.deleteMany({ where: { projectId } }),
    db.projectMember.createMany({ 
      data: memberIds.map(id => ({ projectId, employeeId: id })) 
    })
  ]);

  // Calculate new members and notify them
  const existingMemberIds = existing.members.map(m => m.employeeId);
  const newlyAddedIds = memberIds.filter(id => !existingMemberIds.includes(id));

  if (newlyAddedIds.length > 0) {
    const { createNotification } = await import("@/lib/notifications");
    await Promise.all(newlyAddedIds.map(id =>
      createNotification({
        recipientId: id,
        type: "PROJECT_ADDED",
        title: "Added to Project",
        message: `You have been added to the project: ${existing.name}`,
        actionUrl: `/projects/${existing.id}`
      })
    ));
  }
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function deleteProjectAction(projectId: string) {
  const employee = await requireAuth("project:delete");

  const existing = await db.project.findUnique({ where: { id: projectId } });
  if (!existing) throw new Error("Project not found");

  await db.project.delete({
    where: { id: projectId }
  });

  revalidatePath("/projects");
  revalidatePath("/");
  return { success: true };
}
