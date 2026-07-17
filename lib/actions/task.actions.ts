"use server";

import { db } from "@/lib/db";
import { requireAuth, getCurrentEmployee, checkPermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getKanbanTasks } from "@/lib/queries/task.queries";

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

export async function updateTaskAction(taskId: string, data: {
  title: string;
  projectId: string;
  description?: string;
  assigneeIds?: string[];
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  startDate?: Date;
  dueDate?: Date;
  blockers?: string;
}) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("task:update");
  
  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } }, assignees: true }
  });

  if (!existingTask) throw new Error("Task not found");

  if (!hasGlobalPerm) {
    const isAssignee = existingTask.assignees.some(a => a.id === employee.id);
    const isProjectMember = existingTask.project.members.some(m => m.employeeId === employee.id);
    if (!isAssignee && !isProjectMember) throw new Error("You do not have permission for this action.");
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      priority: data.priority,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      blockers: data.blockers,
      assignees: {
        set: data.assigneeIds && data.assigneeIds.length > 0 
          ? data.assigneeIds.map(id => ({ id })) 
          : []
      }
    }
  });

  revalidatePath("/", "layout");
  return { success: true, taskId: updatedTask.id };
}

export async function updateTaskStatusAction(taskId: string, newStatus: any) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("task:update");

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } }, assignees: true }
  });

  if (!task) throw new Error("Task not found");

  if (!hasGlobalPerm) {
    const isAssignee = task.assignees.some(a => a.id === employee.id);
    const isProjectMember = task.project.members.some(m => m.employeeId === employee.id);
    if (!isAssignee && !isProjectMember) throw new Error("You do not have permission for this action.");
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: { 
      status: newStatus,
      completedAt: newStatus === "DONE" ? new Date() : null
    },
    include: { blocking: true }
  });

  

  // Auto-unblock dependent tasks if this task is now DONE
  if (newStatus === "DONE" && updatedTask.blocking && updatedTask.blocking.length > 0) {
    for (const blockedTask of updatedTask.blocking) {
      await db.task.update({
        where: { id: blockedTask.id },
        data: { blockedById: null }
      });
      
    }
  }

  revalidatePath("/", "layout");
  return { success: true, task: updatedTask };
}

export async function updateTaskPriorityAction(taskId: string, newPriority: any) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("task:update");

  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } }, assignees: true }
  });

  if (!existingTask) throw new Error("Task not found");

  if (!hasGlobalPerm) {
    const isAssignee = existingTask.assignees.some(a => a.id === employee.id);
    const isProjectMember = existingTask.project.members.some(m => m.employeeId === employee.id);
    if (!isAssignee && !isProjectMember) throw new Error("You do not have permission for this action.");
  }

  const task = await db.task.update({
    where: { id: taskId },
    data: { priority: newPriority }
  });

  

  revalidatePath("/", "layout");
  return { success: true, task };
}

export async function setTaskBlockerAction(taskId: string, blockerTaskId: string | null) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("task:update");

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } }, assignees: true }
  });

  if (!task) throw new Error("Task not found");

  if (!hasGlobalPerm) {
    const isAssignee = task.assignees.some(a => a.id === employee.id);
    const isProjectMember = task.project.members.some(m => m.employeeId === employee.id);
    if (!isAssignee && !isProjectMember) throw new Error("You do not have permission for this action.");
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: { blockedById: blockerTaskId }
  });

  revalidatePath("/", "layout");
  return { success: true, task: updatedTask };
}

export async function createSubtaskAction(parentId: string, data: { title: string; assigneeId?: string; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("task:create");

  const parentTask = await db.task.findUnique({ 
    where: { id: parentId },
    include: { project: { include: { members: true } }, assignees: true }
  });

  if (!parentTask) throw new Error("Parent task not found");

  if (!hasGlobalPerm) {
    const isAssignee = parentTask.assignees.some(a => a.id === employee.id);
    const isProjectMember = parentTask.project.members.some(m => m.employeeId === employee.id);
    if (!isAssignee && !isProjectMember) throw new Error("You do not have permission for this action.");
  }

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
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("task:update");

  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } }, assignees: true }
  });

  if (!existingTask) throw new Error("Task not found");

  if (!hasGlobalPerm) {
    const isAssignee = existingTask.assignees.some(a => a.id === employee.id);
    const isProjectMember = existingTask.project.members.some(m => m.employeeId === employee.id);
    if (!isAssignee && !isProjectMember) throw new Error("You do not have permission for this action.");
  }

  const task = await db.task.update({
    where: { id: taskId },
    data: {
      assignees: assigneeId ? { set: [{ id: assigneeId }] } : { set: [] }
    }
  });

  

  revalidatePath("/", "layout");
  return { success: true, task };
}

export async function loadMoreTasksAction(filters: any, skip: number) {
  return await getKanbanTasks(filters, skip, 50);
}

export async function deleteTaskAction(taskId: string) {
  const employee = await requireAuth("task:delete");

  const existingTask = await db.task.findUnique({
    where: { id: taskId }
  });

  if (!existingTask) throw new Error("Task not found");

  await db.task.delete({ where: { id: taskId } });
  revalidatePath("/", "layout");
  return { success: true };
}
