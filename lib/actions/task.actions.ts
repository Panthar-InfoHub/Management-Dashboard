"use server";

import { db } from "@/lib/db";
import { requireAuth, getCurrentEmployee, checkPermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getKanbanTasks } from "@/lib/queries/task.queries";
import { assertAssignable } from "@/lib/tasks/assignees";
import { audit, diffFields } from "@/lib/audit";
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

function uniqueIds(ids: string[] | undefined): string[] {
  return [...new Set((ids ?? []).filter(Boolean))];
}

function toDate(value: Date | string | undefined | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new Error("Invalid date.");
  return date;
}

/** Refresh every page that shows this task: board, detail, parent, project, dashboard. */
function revalidateTaskViews(task: { id: string; projectId: string; parentId?: string | null }) {
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${task.id}`);
  if (task.parentId) revalidatePath(`/tasks/${task.parentId}`);
  revalidatePath("/projects");
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/");
}

const taskAccessInclude = {
  project: { select: { members: { select: { employeeId: true } } } },
  assignees: { select: { id: true } },
} as const;

type TaskWithAccess = {
  creatorId: string;
  assignees: { id: string }[];
  project: { members: { employeeId: string }[] };
};

function isInvolved(task: TaskWithAccess, employeeId: string) {
  return (
    task.creatorId === employeeId ||
    task.assignees.some((a) => a.id === employeeId) ||
    task.project.members.some((m) => m.employeeId === employeeId)
  );
}

async function notifyAssigned(taskId: string, title: string, recipientIds: string[], actorId: string, heading = "Task Assigned") {
  const recipients = recipientIds.filter((id) => id !== actorId);
  if (recipients.length === 0) return;
  await db.notification.createMany({
    data: recipients.map((recipientId) => ({
      recipientId,
      type: "TASK_ASSIGNED",
      title: heading,
      message: `You were assigned to: ${title}`,
      actionUrl: `/tasks/${taskId}`,
    })),
  });
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
  if (!data.title?.trim()) throw new Error("Task title is required.");
  if (!data.projectId?.trim()) throw new Error("Project ID is required.");
  assertValidPriority(data.priority);

  const employee = await requireAuth("task:create", data.projectId);
  const assigneeIds = uniqueIds(data.assigneeIds);
  await assertAssignable(data.projectId, assigneeIds);

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
      startDate: toDate(data.startDate),
      dueDate: toDate(data.dueDate),
      blockers: data.blockers,
      assignees: assigneeIds.length > 0 ? { connect: assigneeIds.map(id => ({ id })) } : undefined,
    }
  });

  await notifyAssigned(task.id, task.title, assigneeIds, employee.id, "New Task Assigned");
  audit({ actorId: employee.id, entity: "Task", entityId: task.id, action: "create", changes: { title: task.title, projectId: task.projectId, assigneeIds } });

  revalidateTaskViews(task);
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
  if (!data.title?.trim()) throw new Error("Task title is required.");
  assertValidPriority(data.priority);

  const employee = await getCurrentEmployee();
  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    include: taskAccessInclude,
  });
  if (!existingTask) throw new Error("Task not found");

  const hasGlobalPerm = await checkPermission("task:update", existingTask.projectId);
  if (!hasGlobalPerm) {
    const isAssignee = existingTask.assignees.some(a => a.id === employee.id);
    if (existingTask.creatorId !== employee.id && !isAssignee) {
      throw new Error("You do not have permission to edit this task's details.");
    }
  }

  const projectId = data.projectId || existingTask.projectId;
  if (projectId !== existingTask.projectId) {
    // Moving a task needs task:create rights on the destination project.
    if (!(await checkPermission("task:create", projectId)) && !(await checkPermission("task:update", projectId))) {
      throw new Error("You do not have permission to move tasks into that project.");
    }
    if (existingTask.parentId) throw new Error("Subtasks stay in their parent's project. Move the parent task instead.");
  }

  const assigneeIds = uniqueIds(data.assigneeIds);
  const sameProject = projectId === existingTask.projectId;
  await assertAssignable(projectId, assigneeIds, sameProject ? existingTask.assignees.map(a => a.id) : []);

  const next = {
    title: data.title.trim(),
    description: data.description,
    projectId,
    priority: data.priority,
    startDate: toDate(data.startDate),
    dueDate: toDate(data.dueDate),
    blockers: data.blockers,
  };

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: { ...next, assignees: { set: assigneeIds.map(id => ({ id })) } },
  });

  const previousIds = existingTask.assignees.map(a => a.id);
  await notifyAssigned(taskId, updatedTask.title, assigneeIds.filter(id => !previousIds.includes(id)), employee.id);
  audit({
    actorId: employee.id, entity: "Task", entityId: taskId, action: "update",
    changes: { ...(diffFields(existingTask, next) as object), ...(previousIds.sort().join() !== [...assigneeIds].sort().join() ? { assigneeIds: [previousIds, assigneeIds] } : {}) },
  });

  revalidateTaskViews(updatedTask);
  if (!sameProject) revalidatePath(`/projects/${existingTask.projectId}`);
  return { success: true, taskId: updatedTask.id };
}

export async function updateTaskStatusAction(taskId: string, newStatus: string, newOrder?: number) {
  assertValidStatus(newStatus);
  if (newOrder !== undefined && (typeof newOrder !== "number" || isNaN(newOrder))) {
    throw new Error("Invalid task order value");
  }

  const employee = await getCurrentEmployee();
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: taskAccessInclude,
  });
  if (!task) throw new Error("Task not found");

  const hasGlobalPerm = await checkPermission("task:update", task.projectId);
  if (!hasGlobalPerm && !isInvolved(task, employee.id)) {
    throw new Error("You do not have permission for this action.");
  }

  if (newStatus === "DONE" && task.status !== "DONE") {
    const openSubtasks = await db.task.count({ where: { parentId: taskId, status: { not: "DONE" } } });
    if (openSubtasks > 0) {
      throw new Error(`${openSubtasks} subtask${openSubtasks === 1 ? " is" : "s are"} still open. Finish or delete ${openSubtasks === 1 ? "it" : "them"} before marking this task done.`);
    }
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: newStatus,
      ...(newOrder !== undefined ? { order: newOrder } : {}),
      // Keep the original completion time when a DONE task is only reordered.
      completedAt: newStatus === "DONE" ? (task.status === "DONE" ? task.completedAt : new Date()) : null,
      completionNote: newStatus === "DONE" ? undefined : null,
      prLink: newStatus === "DONE" ? undefined : null
    },
    include: { blocking: { select: { id: true } } }
  });

  // Auto-unblock dependent tasks if this task is now DONE
  if (newStatus === "DONE" && updatedTask.blocking.length > 0) {
    await db.task.updateMany({
      where: { id: { in: updatedTask.blocking.map((t) => t.id) } },
      data: { blockedById: null }
    });
  }

  if (task.status !== newStatus) {
    audit({ actorId: employee.id, entity: "Task", entityId: taskId, action: "status", changes: { status: [task.status, newStatus] } });
  }

  revalidateTaskViews(updatedTask);
  return { success: true, task: { ...updatedTask, blocking: undefined } };
}

export async function updateTaskPriorityAction(taskId: string, newPriority: string) {
  assertValidPriority(newPriority);

  const employee = await getCurrentEmployee();
  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    include: taskAccessInclude,
  });
  if (!existingTask) throw new Error("Task not found");

  const hasGlobalPerm = await checkPermission("task:update", existingTask.projectId);
  if (!hasGlobalPerm && !isInvolved(existingTask, employee.id)) {
    throw new Error("You do not have permission for this action.");
  }

  const task = await db.task.update({
    where: { id: taskId },
    data: { priority: newPriority }
  });

  audit({ actorId: employee.id, entity: "Task", entityId: taskId, action: "update", changes: { priority: [existingTask.priority, newPriority] } });
  revalidateTaskViews(task);
  return { success: true, task };
}

export async function setTaskBlockerAction(taskId: string, blockerTaskId: string | null) {
  const employee = await getCurrentEmployee();
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: taskAccessInclude,
  });
  if (!task) throw new Error("Task not found");

  const hasGlobalPerm = await checkPermission("task:update", task.projectId);
  if (!hasGlobalPerm && !isInvolved(task, employee.id)) {
    throw new Error("You do not have permission for this action.");
  }

  if (blockerTaskId) {
    if (blockerTaskId === taskId) throw new Error("A task can't block itself.");
    const blocker = await db.task.findUnique({ where: { id: blockerTaskId }, select: { projectId: true, blockedById: true } });
    if (!blocker || blocker.projectId !== task.projectId) throw new Error("The blocker must be a task in the same project.");
    if (blocker.blockedById === taskId) throw new Error("These tasks would block each other. Remove the other blocker first.");
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: { blockedById: blockerTaskId }
  });

  audit({ actorId: employee.id, entity: "Task", entityId: taskId, action: "blocker", changes: { blockedById: [task.blockedById, blockerTaskId] } });
  revalidateTaskViews(updatedTask);
  return { success: true, task: updatedTask };
}

export async function createSubtaskAction(parentId: string, data: {
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assigneeIds?: string[];
  /** @deprecated use assigneeIds */
  assigneeId?: string;
  dueDate?: string | Date | null;
}) {
  if (!data.title?.trim()) throw new Error("Subtask title is required.");
  assertValidPriority(data.priority);

  const employee = await getCurrentEmployee();
  const parentTask = await db.task.findUnique({
    where: { id: parentId },
    include: taskAccessInclude,
  });
  if (!parentTask) throw new Error("Parent task not found");

  const assigneeIds = uniqueIds(data.assigneeIds ?? (data.assigneeId ? [data.assigneeId] : []));
  const hasGlobalPerm = await checkPermission("task:create", parentTask.projectId);
  if (!hasGlobalPerm) {
    if (!isInvolved(parentTask, employee.id)) throw new Error("You do not have permission for this action.");
    // Without task:create, you can only assign the subtask to yourself.
    if (assigneeIds.some(id => id !== employee.id)) {
      throw new Error("You can only assign this subtask to yourself.");
    }
  }
  await assertAssignable(parentTask.projectId, assigneeIds);

  const dueDate = toDate(data.dueDate);
  if (dueDate && parentTask.dueDate && dueDate > parentTask.dueDate) {
    throw new Error(`A subtask can't be due after its parent (${parentTask.dueDate.toISOString().slice(0, 10)}).`);
  }

  const subtask = await db.task.create({
    data: {
      title: data.title.trim(),
      projectId: parentTask.projectId,
      parentId,
      creatorId: employee.id,
      priority: data.priority,
      dueDate,
      assignees: assigneeIds.length > 0 ? { connect: assigneeIds.map(id => ({ id })) } : undefined,
    }
  });

  await notifyAssigned(subtask.id, subtask.title, assigneeIds, employee.id);
  audit({ actorId: employee.id, entity: "Task", entityId: subtask.id, action: "create", changes: { title: subtask.title, parentId, assigneeIds } });

  revalidateTaskViews(subtask);
  return { success: true, subtask };
}

/** Replace a task's assignees. Only people on the project (or its team) can be added. */
export async function setTaskAssigneesAction(taskId: string, assigneeIdsInput: string[]) {
  const employee = await getCurrentEmployee();
  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    include: taskAccessInclude,
  });
  if (!existingTask) throw new Error("Task not found");

  const canAssign =
    (await checkPermission("task:assign", existingTask.projectId)) ||
    (await checkPermission("task:update", existingTask.projectId)) ||
    existingTask.creatorId === employee.id;
  if (!canAssign) throw new Error("You do not have permission to assign this task.");

  const assigneeIds = uniqueIds(assigneeIdsInput);
  const previousIds = existingTask.assignees.map(a => a.id);
  await assertAssignable(existingTask.projectId, assigneeIds, previousIds);

  const task = await db.task.update({
    where: { id: taskId },
    data: { assignees: { set: assigneeIds.map(id => ({ id })) } },
  });

  await notifyAssigned(task.id, task.title, assigneeIds.filter(id => !previousIds.includes(id)), employee.id);
  audit({ actorId: employee.id, entity: "Task", entityId: taskId, action: "assign", changes: { assigneeIds: [previousIds, assigneeIds] } });

  revalidateTaskViews(task);
  return { success: true, task };
}

/** Single-assignee shortcut kept for existing callers. */
export async function assignTaskAction(taskId: string, assigneeId: string | null) {
  return setTaskAssigneesAction(taskId, assigneeId ? [assigneeId] : []);
}

export async function loadMoreTasksAction(filters: { team?: string; project?: string; assignee?: string; search?: string }, skip: number) {
  // getKanbanTasks internally calls getCurrentEmployee() for auth
  return await getKanbanTasks(filters, skip, 50);
}

export async function deleteTaskAction(taskId: string) {
  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, projectId: true, parentId: true },
  });
  if (!existingTask) throw new Error("Task not found");

  const employee = await requireAuth("task:delete", existingTask.projectId);
  await db.task.delete({ where: { id: taskId } });

  audit({ actorId: employee.id, entity: "Task", entityId: taskId, action: "delete", changes: { title: existingTask.title, projectId: existingTask.projectId } });
  revalidateTaskViews(existingTask);
  return { success: true };
}

export async function rebalanceColumnTasksAction(orderedTaskIds: string[]) {
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
