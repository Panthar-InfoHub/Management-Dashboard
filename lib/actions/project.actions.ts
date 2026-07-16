"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateProjectStatusAction(projectId: string, newStatus: any) {
  const employee = await requireAuth("project:update");

  const project = await db.project.update({
    where: { id: projectId },
    data: { status: newStatus }
  });

  await db.auditLog.create({
    data: {
      action: "STATUS_CHANGE",
      entity: "Project",
      entityId: project.id,
      description: `Moved project to ${newStatus}`,
      actorId: employee.id
    }
  });

  revalidatePath("/projects");
  revalidatePath("/");

  return { success: true, project };
}

export async function createProjectAction(data: {
  name: string;
  description?: string;
  leadId: string;
  teamId: string;
  status: any;
  health: any;
  priority: any;
  startDate?: Date;
  endDate?: Date;
}) {
  const employee = await requireAuth("project:create");

  const project = await db.project.create({
    data: {
      name: data.name,
      description: data.description,
      leadId: data.leadId,
      teamId: data.teamId,
      status: data.status,
      health: data.health,
      priority: data.priority,
      startDate: data.startDate,
      endDate: data.endDate,
      members: {
        create: [
          { employeeId: data.leadId },
          ...(data.leadId !== employee.id ? [{ employeeId: employee.id }] : [])
        ]
      }
    }
  });

  await db.auditLog.create({
    data: {
      action: "CREATE",
      entity: "Project",
      entityId: project.id,
      description: `Created project ${project.name}`,
      actorId: employee.id
    }
  });

  revalidatePath("/projects");
  revalidatePath("/");

  return { success: true, project };
}
