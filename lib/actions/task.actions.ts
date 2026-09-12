"use server";

import { db } from "@/lib/db";
import { requireAuth, getCurrentEmployee, checkPermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getKanbanTasks } from "@/lib/queries/task.queries";
import type { TaskStatus, TaskPriority } from "@/lib/generated/prisma";

// ─── Validation Helpers ───

const VALID_STATUSES: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "TESTING", "DONE"];
const VALID_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function assertValidStatus(value: unknown): asserts value is TaskStatus {
  if (!VALID_STATUSES.includes(value as TaskStatus)) {
    throw new Error(`Invalid task status: ${String(value)}`);
  }
}

function assertValidPriority(value: unknown): asserts value is TaskPriority {
  if (!VALID_PRIORITIES.includes(value as TaskPriority)) {
    throw new Error(`Invalid task priority: ${String(value)}`);
  }
}

// ─── Actions ───

export async function createTaskAction(data: {
  title: string;
  description?: string;
  projectId: string;
  assigneeIds?: string[];
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  startDate?: Date;
  dueDate?: Date;
  blockers?: string;
}) {
  const employee = await requireAuth("task:create");

  if (!data.title?.trim()) throw new Error("Task title is required.");
  if (!data.projectId?.trim()) throw new Error("Project ID is required.");
  assertValidPriority(data.priority);

  // Position new tasks at the top of BACKLOG
  const firstTask = await db.task.findFirst({
    where: { projectId: data.projectId, status: "BACKLOG" },
    orderBy: { order: "asc" },
    select: { order: true }
  });
  const initialOrder = firstTask ? firstTask.order - 1000 : 1000;

  const task = await db.task.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      projectId: data.projectId,
      creatorId: employee.id,
      priority: data.priority,
      order: initialOrder,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      blockers: data.blockers,
      assignees: data.assigneeIds && data.assigneeIds.length > 0 
        ? { connect: data.assigneeIds.map(id => ({ id })) } 
        : undefined,
    }
  });

  if (data.assigneeIds && data.assigneeIds.length > 0) {
    const assigneesToNotify = data.assigneeIds.filter(id => id !== employee.id);
    if (assigneesToNotify.length > 0) {
      await db.notification.createMany({
        data: assigneesToNotify.map(id => ({
          recipientId: id,
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          message: `You were assigned a new task: ${task.title}`,
          actionUrl: `/tasks/${task.id}`
        }))
      });
    }
  }

  revalidatePath("/projects");
  revalidatePath(`/tasks/${task.id}`);
  revalidatePath("/");
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

  if (!data.title?.trim()) throw new Error("Task title is required.");
  assertValidPriority(data.priority);

  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    include: { project: { include: { members: true } }, assignees: true }
  });

  if (!existingTask) throw new Error("Task not found");

  if (!hasGlobalPerm) {
    const isAssignee = existingTask.assignees.some(a => a.id === employee.id);
    if (existingTask.creatorId !== employee.id && !isAssignee) {
      throw new Error("You do not have permission to edit this task's details.");
    }
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      title: data.title.trim(),
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

  revalidatePath("/projects");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/");
  return { success: true, taskId: updatedTask.id };
}

export async function updateTaskStatusAction(taskId: string, newStatus: string, newOrder?: number) {
  assertValidStatus(newStatus);
  if (newOrder !== undefined && (typeof newOrder !== "number" || isNaN(newOrder))) {
    throw new Error("Invalid task order value");
  }

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
      ...(newOrder !== undefined ? { order: newOrder } : {}),
      completedAt: newStatus === "DONE" ? new Date() : null,
      completionNote: newStatus === "DONE" ? undefined : null,
      prLink: newStatus === "DONE" ? undefined : null
    },
    include: { blocking: true }
  });

  // Auto-unblock dependent tasks if this task is now DONE
  if (newStatus === "DONE" && updatedTask.blocking && updatedTask.blocking.length > 0) {
    await db.task.updateMany({
      where: { id: { in: updatedTask.blocking.map((t) => t.id) } },
      data: { blockedById: null }
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/projects");
  revalidatePath("/");
  return { success: true, task: updatedTask };
}

export async function updateTaskPriorityAction(taskId: string, newPriority: string) {
  assertValidPriority(newPriority);

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

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/");
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

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return { success: true, task: updatedTask };
}

export async function createSubtaskAction(parentId: string, data: { title: string; assigneeId?: string; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("task:create");

  if (!data.title?.trim()) throw new Error("Subtask title is required.");
  assertValidPriority(data.priority);

  const parentTask = await db.task.findUnique({ 
    where: { id: parentId },
    include: { project: { include: { members: true } }, assignees: true }
  });

  if (!parentTask) throw new Error("Parent task not found");

  if (!hasGlobalPerm) {
    const isAssignee = parentTask.assignees.some(a => a.id === employee.id);
    const isProjectMember = parentTask.project.members.some(m => m.employeeId === employee.id);
    if (!isAssignee && !isProjectMember) throw new Error("You do not have permission for this action.");

    // Without task:create/task:update, you can only assign the subtask to yourself.
    if (data.assigneeId && data.assigneeId !== employee.id) {
      throw new Error("You can only assign this subtask to yourself.");
    }
  }

  const subtask = await db.task.create({
    data: {
      title: data.title.trim(),
      projectId: parentTask.projectId,
      parentId: parentId,
      creatorId: employee.id,
      priority: data.priority,
      assignees: data.assigneeId ? { connect: [{ id: data.assigneeId }] } : undefined,
    }
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${parentId}`);
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
    if (existingTask.creatorId !== employee.id) {
      throw new Error("You do not have permission to assign this task.");
    }
  }

  const task = await db.task.update({
    where: { id: taskId },
    data: {
      assignees: assigneeId ? { set: [{ id: assigneeId }] } : { set: [] }
    }
  });

  if (assigneeId && assigneeId !== employee.id) {
    const { createNotification } = await import("@/lib/notifications");
    await createNotification({
      recipientId: assigneeId,
      type: "TASK_ASSIGNED",
      title: "Task Assigned",
      message: `You were assigned to: ${task.title}`,
      actionUrl: `/tasks/${task.id}`
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return { success: true, task };
}

export async function loadMoreTasksAction(filters: { team?: string; project?: string; assignee?: string; search?: string }, skip: number) {
  // getKanbanTasks internally calls getCurrentEmployee() for auth
  return await getKanbanTasks(filters, skip, 50);
}

export async function deleteTaskAction(taskId: string) {
  const employee = await requireAuth("task:delete");

  const existingTask = await db.task.findUnique({
    where: { id: taskId }
  });

  if (!existingTask) throw new Error("Task not found");

  await db.task.delete({ where: { id: taskId } });

  revalidatePath("/tasks");
  revalidatePath("/projects");
  revalidatePath("/");
  return { success: true };
}

export async function rebalanceColumnTasksAction(orderedTaskIds: string[]) {
  const employee = await getCurrentEmployee();
  const hasGlobalPerm = await checkPermission("task:update");
  if (!hasGlobalPerm) throw new Error("You do not have permission for this action.");

  if (!orderedTaskIds || orderedTaskIds.length === 0) return { success: true };

  await db.$transaction(
    orderedTaskIds.map((id, index) => 
      db.task.update({
        where: { id },
        data: { order: (index + 1) * 1000 }
      })
    )
  );

  revalidatePath("/tasks");
  return { success: true };
}

