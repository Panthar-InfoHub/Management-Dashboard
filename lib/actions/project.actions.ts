"use server";
import { UserError } from "@/lib/errors";
import { normaliseProjectKey, suggestProjectKey } from "@/lib/tasks/keys";

import { db } from "@/lib/db";
import { requireAuth, getCurrentEmployee, checkPermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { ProjectStatus, TaskPriority } from "@/lib/generated/prisma";

// ─── Validation Helpers ───

const VALID_PROJECT_STATUSES: ProjectStatus[] = ["PLANNING", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"];
const VALID_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function assertValidProjectStatus(value: unknown): asserts value is ProjectStatus {
  if (!VALID_PROJECT_STATUSES.includes(value as ProjectStatus)) {
    throw new UserError(`Invalid project status: ${String(value)}`);
  }
}

function assertValidPriority(value: unknown): asserts value is TaskPriority {
  if (!VALID_PRIORITIES.includes(value as TaskPriority)) {
    throw new UserError(`Invalid priority: ${String(value)}`);
  }
}

// ─── Actions ───

export async function updateProjectStatusAction(projectId: string, newStatus: string) {
  assertValidProjectStatus(newStatus);

  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("project:update");

  const existing = await db.project.findUnique({ where: { id: projectId } });
  if (!existing) throw new UserError("Project not found");
  if (!hasGlobalPerm && existing.leadId !== employee.id) {
    throw new UserError("You do not have permission for this action.");
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: { status: newStatus }
  });

  audit({ actorId: employee.id, entity: "Project", entityId: projectId, action: "status", changes: { status: newStatus } });
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
  if (!existing) throw new UserError("Project not found");
  if (!hasGlobalPerm && existing.leadId !== employee.id) {
    throw new UserError("You do not have permission for this action.");
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: { priority: newPriority }
  });

  audit({ actorId: employee.id, entity: "Project", entityId: projectId, action: "update", changes: { priority: newPriority } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);

  return { success: true, project };
}


/** The key to save: what was typed (must be free), or one suggested from the name. */
async function resolveProjectKey(typed: string | undefined, name: string, projectId?: string): Promise<string> {
  if (typed?.trim()) {
    const key = normaliseProjectKey(typed);
    if (!key) throw new UserError("Project key must be 2–6 letters or digits, starting with a letter, e.g. JNV.");
    const taken = await db.project.findFirst({ where: { key, ...(projectId ? { id: { not: projectId } } : {}) }, select: { name: true } });
    if (taken) throw new UserError(`Key ${key} is used by ${taken.name}. Choose another.`);
    return key;
  }
  const base = suggestProjectKey(name);
  for (let i = 1; ; i++) {
    const key = i === 1 ? base : `${base}${i}`;
    const taken = await db.project.findFirst({ where: { key, ...(projectId ? { id: { not: projectId } } : {}) }, select: { id: true } });
    if (!taken) return key;
  }
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
  /** Short code for task IDs; suggested from the name when empty. */
  key?: string;
}) {
  const employee = await requireAuth("project:create");

  if (!data.name?.trim()) throw new UserError("Project name is required.");
  if (!data.leadId?.trim()) throw new UserError("Project lead is required.");
  if (!data.teamId?.trim()) throw new UserError("Team is required.");
  assertValidProjectStatus(data.status);
  assertValidPriority(data.priority);

  const membersToAdd = [
    { employeeId: data.leadId },
    ...(data.leadId !== employee.id ? [{ employeeId: employee.id }] : [])
  ];

  if (data.addTeamMembers && data.teamId) {
    const team = await db.team.findUnique({
      where: { id: data.teamId },
      include: { memberships: { where: { employee: { status: { not: "INACTIVE" } } }, select: { employeeId: true } } }
    });
    if (team) {
      team.memberships.forEach((m) => {
        if (!membersToAdd.find((x) => x.employeeId === m.employeeId)) {
          membersToAdd.push({ employeeId: m.employeeId });
        }
      });
    }
  }

  const key = await resolveProjectKey(data.key, data.name);
  const project = await db.project.create({
    data: {
      key,
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

  audit({ actorId: employee.id, entity: "Project", entityId: project.id, action: "create", changes: { name: project.name, teamId: project.teamId } });
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
  /** Changing it renames every task ID in the project. */
  key?: string;
  /** "YYYY-MM-DD"; null clears it. Both are optional: a project can run without a deadline. */
  startDate?: string | null;
  endDate?: string | null;
}) {
  const employee = await getCurrentEmployee();
  // For this project: admins, its lead, its team's lead and anyone granted it.
  const hasGlobalPerm = await checkPermission("project:update", projectId);

  if (!data.name?.trim()) throw new UserError("Project name is required.");
  assertValidProjectStatus(data.status);
  assertValidPriority(data.priority);

  const existing = await db.project.findUnique({ where: { id: projectId } });
  if (!existing) throw new UserError("Project not found");
  if (!hasGlobalPerm && existing.leadId !== employee.id) {
    throw new UserError("You do not have permission for this action.");
  }

  const dayStart = (v: string | null | undefined) => (v ? new Date(`${v}T00:00:00`) : null);
  const startDate = data.startDate === undefined ? existing.startDate : dayStart(data.startDate);
  const endDate = data.endDate === undefined ? existing.endDate : (data.endDate ? new Date(`${data.endDate}T23:59:59.999`) : null);
  if (startDate && endDate && endDate < startDate) throw new UserError("The deadline is before the start date.");

  const key = data.key?.trim() || !existing.key ? await resolveProjectKey(data.key, data.name, projectId) : existing.key;
  const project = await db.project.update({
    where: { id: projectId },
    data: {
      key,
      startDate,
      endDate,
      name: data.name.trim(),
      description: data.description,
      leadId: data.leadId,
      teamId: data.teamId,
      status: data.status as ProjectStatus,
      priority: data.priority as TaskPriority,
    }
  });

  audit({ actorId: employee.id, entity: "Project", entityId: projectId, action: "update", changes: JSON.parse(JSON.stringify(data)) });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { success: true, project };
}

export async function manageProjectMembersAction(projectId: string, memberIds: string[]) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("project:update");

  if (!Array.isArray(memberIds)) throw new UserError("Member IDs must be an array.");

  const existing = await db.project.findUnique({ 
    where: { id: projectId },
    include: { members: true }
  });
  if (!existing) throw new UserError("Project not found");
  if (!hasGlobalPerm && existing.leadId !== employee.id) {
    throw new UserError("You do not have permission for this action.");
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
  audit({ actorId: employee.id, entity: "Project", entityId: projectId, action: "members", changes: { memberIds } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function deleteProjectAction(projectId: string) {
  const employee = await requireAuth("project:delete");

  const existing = await db.project.findUnique({ where: { id: projectId } });
  if (!existing) throw new UserError("Project not found");

  await db.project.delete({
    where: { id: projectId }
  });

  audit({ actorId: employee.id, entity: "Project", entityId: projectId, action: "delete" });
  revalidatePath("/projects");
  revalidatePath("/");
  return { success: true };
}
