"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createTaskAction(data: {
  title: string;
  projectId: string;
  assigneeIds?: string[];
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  startDate?: Date;
  dueDate?: Date;
  blockers?: string;
}) {
  const employee = await requireAuth("task:create");

  const task = await db.task.create({
    data: {
      title: data.title,
      projectId: data.projectId,
      creatorId: employee.id,
      priority: data.priority,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      blockers: data.blockers,
      assignees: data.assigneeIds && data.assigneeIds.length > 0 
        ? { connect: data.assigneeIds.map(id => ({ id })) } 
        : undefined,
    }
  });

  // Log audit
  await db.auditLog.create({
    data: {
      action: "CREATE",
      entity: "Task",
      entityId: task.id,
      description: `Created task: ${task.title}`,
      actorId: employee.id
    }
  });

  revalidatePath("/tasks");
  revalidatePath("/projects");
  revalidatePath("/");
  
  return { success: true, taskId: task.id };
}

export async function updateTaskStatusAction(taskId: string, newStatus: any) {
  const employee = await requireAuth("task:update:any");

  const task = await db.task.update({
    where: { id: taskId },
    data: { status: newStatus }
  });

  await db.auditLog.create({
    data: {
      action: "STATUS_CHANGE",
      entity: "Task",
      entityId: task.id,
      description: `Moved task to ${newStatus}`,
      actorId: employee.id
    }
  });

  revalidatePath("/tasks");
  revalidatePath("/projects");
  revalidatePath("/");

  return { success: true, task };
}
