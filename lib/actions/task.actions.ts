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
  

  revalidatePath("/", "layout");
  return { success: true, taskId: task.id };
}

export async function updateTaskStatusAction(taskId: string, newStatus: any) {
  const employee = await requireAuth("task:update:any");

  const task = await db.task.update({
    where: { id: taskId },
    data: { status: newStatus },
    include: { blocking: true }
  });

  

  // Auto-unblock dependent tasks if this task is now DONE
  if (newStatus === "DONE" && task.blocking && task.blocking.length > 0) {
    for (const blockedTask of task.blocking) {
      await db.task.update({
        where: { id: blockedTask.id },
        data: { blockedById: null }
      });
      
    }
  }

  revalidatePath("/", "layout");
  return { success: true, task };
}

export async function updateTaskPriorityAction(taskId: string, newPriority: any) {
  const employee = await requireAuth("task:update:any");

  const task = await db.task.update({
    where: { id: taskId },
    data: { priority: newPriority }
  });

  

  revalidatePath("/", "layout");
  return { success: true, task };
}

export async function setTaskBlockerAction(taskId: string, blockerTaskId: string | null) {
  const employee = await requireAuth("task:update:any");

  const task = await db.task.update({
    where: { id: taskId },
    data: { blockedById: blockerTaskId }
  });

  

  revalidatePath("/", "layout");
  return { success: true, task };
}

export async function createSubtaskAction(parentId: string, data: { title: string; assigneeId?: string; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }) {
  const employee = await requireAuth("task:create");

  const parentTask = await db.task.findUnique({ where: { id: parentId } });
  if (!parentTask) throw new Error("Parent task not found");

  const subtask = await db.task.create({
    data: {
      title: data.title,
      projectId: parentTask.projectId,
      parentId: parentId,
      creatorId: employee.id,
      priority: data.priority,
      assignees: data.assigneeId ? { connect: [{ id: data.assigneeId }] } : undefined,
    }
  });

  

  revalidatePath("/", "layout");
  return { success: true, subtask };
}

export async function assignTaskAction(taskId: string, assigneeId: string | null) {
  const employee = await requireAuth("task:assign");

  const task = await db.task.update({
    where: { id: taskId },
    data: {
      assignees: assigneeId ? { set: [{ id: assigneeId }] } : { set: [] }
    }
  });

  

  revalidatePath("/", "layout");
  return { success: true, task };
}
