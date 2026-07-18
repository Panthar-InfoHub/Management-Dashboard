"use server";

import { db } from "@/lib/db";
import { requireAuth, getCurrentEmployee, checkPermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateProjectStatusAction(projectId: string, newStatus: any) {
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
  revalidatePath("/");

  return { success: true, project };
}

export async function updateProjectPriorityAction(projectId: string, newPriority: any) {
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
  status: any;
  priority: any;
  startDate?: Date;
  endDate?: Date;
  addTeamMembers?: boolean;
}) {
  const employee = await requireAuth("project:create");

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
      team.members.forEach((m: any) => {
        if (!membersToAdd.find((x) => x.employeeId === m.id)) {
          membersToAdd.push({ employeeId: m.id });
        }
      });
    }
  }

  const project = await db.project.create({
    data: {
      name: data.name,
      description: data.description,
      leadId: data.leadId,
      teamId: data.teamId,
      status: data.status,
      priority: data.priority,
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
  status: any;
  priority: any;
}) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("project:update");

  const existing = await db.project.findUnique({ where: { id: projectId } });
  if (!existing) throw new Error("Project not found");
  if (!hasGlobalPerm && existing.leadId !== employee.id) {
    throw new Error("You do not have permission for this action.");
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      name: data.name,
      description: data.description,
      leadId: data.leadId,
      teamId: data.teamId,
      status: data.status,
      priority: data.priority,
    }
  });


  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { success: true, project };
}

export async function manageProjectMembersAction(projectId: string, memberIds: string[]) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("project:update");

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
  return { success: true };
}
