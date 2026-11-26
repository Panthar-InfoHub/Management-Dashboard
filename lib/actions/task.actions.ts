"use server";
import { UserError } from "@/lib/errors";

import { db } from "@/lib/db";
import { requireAuth, getCurrentEmployee, checkPermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { assertAssignable } from "@/lib/tasks/assignees";
import { audit, diffFields } from "@/lib/audit";
import type { TaskStatus, TaskPriority, Prisma } from "@/lib/generated/prisma";
import { DONE_NOTE_MIN, GENERAL_TASK_KEY } from "@/lib/tasks/keys";
import { emailTaskAssigned, emailTasksOwned } from "@/lib/email/notify";

// ─── Validation Helpers ───

// The board's five steps. Cancelled is set with cancelTaskAction, not by moving.
const VALID_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "DONE"];
const VALID_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function assertValidStatus(value: unknown): asserts value is TaskStatus {
  if (!VALID_STATUSES.includes(value as TaskStatus)) {
    throw new UserError(`Invalid task status: ${String(value)}`);
  }
}

function assertValidPriority(value: unknown): asserts value is TaskPriority {
  if (!VALID_PRIORITIES.includes(value as TaskPriority)) {
    throw new UserError(`Invalid task priority: ${String(value)}`);
  }
}

function uniqueIds(ids: string[] | undefined): string[] {
  return [...new Set((ids ?? []).filter(Boolean))];
}

/**
 * One Owner, any number of assignees. The Owner is always an assignee; without
 * one picked, the first assignee owns the task.
 */
function ownerAndAssignees(ownerId: string | null | undefined, assigneeIds: string[]) {
  const owner = ownerId || assigneeIds[0] || null;
  const ids = owner && !assigneeIds.includes(owner) ? [owner, ...assigneeIds] : assigneeIds;
  return { ownerId: owner, assigneeIds: ids };
}

/** The next number in a project ("JNV-24"); safe when two tasks are created at once. */
async function nextTaskNumber(tx: Prisma.TransactionClient, projectId: string | null) {
  if (!projectId) {
    // General tasks share one counter: GEN-1, GEN-2…
    const seq = await tx.taskSequence.upsert({ where: { key: GENERAL_TASK_KEY }, create: { key: GENERAL_TASK_KEY, last: 1 }, update: { last: { increment: 1 } } });
    return seq.last;
  }
  const p = await tx.project.update({ where: { id: projectId }, data: { taskCounter: { increment: 1 } }, select: { taskCounter: true } });
  return p.taskCounter;
}

function assertDoneNote(note: string | null | undefined): string {
  const text = note?.trim() ?? "";
  if (text.length < DONE_NOTE_MIN) throw new UserError(`Add a note of at least ${DONE_NOTE_MIN} characters on what was done.`);
  return text;
}

function toDate(value: Date | string | undefined | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new UserError("Invalid date.");
  return date;
}

/** Refresh every page that shows this task: board, detail, parent, project, dashboard. */
function revalidateTaskViews(task: { id: string; projectId: string | null; parentId?: string | null }) {
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${task.id}`);
  if (task.parentId) revalidatePath(`/tasks/${task.parentId}`);
  revalidatePath("/projects");
  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/");
}

const taskAccessInclude = {
  project: { select: { members: { select: { employeeId: true } } } },
  assignees: { select: { id: true } },
} as const;

type TaskWithAccess = {
  creatorId: string;
  assignees: { id: string }[];
  project: { members: { employeeId: string }[] } | null;
};

function isInvolved(task: TaskWithAccess, employeeId: string) {
  return (
    task.creatorId === employeeId ||
    task.assignees.some((a) => a.id === employeeId) ||
    (task.project?.members.some((m) => m.employeeId === employeeId) ?? false)
  );
}

type Actor = { id: string; firstName: string; lastName: string };

async function notifyAssigned(taskId: string, title: string, recipientIds: string[], actor: Actor, heading = "Task Assigned") {
  const recipients = [...new Set(recipientIds)].filter((id) => id !== actor.id);
  if (recipients.length === 0) return;
  emailTaskAssigned(taskId, recipients, `${actor.firstName} ${actor.lastName}`, heading === "You Own a Task" ? "owner" : "assigned");
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
  /** null: a General task (GEN-n), not in any project. */
  projectId: string | null;
  assigneeIds?: string[];
  ownerId?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  startDate?: Date;
  dueDate?: Date;
  /** Allow people outside the project (leads and admins only). */
  outside?: boolean;
}) {
  if (!data.title?.trim()) throw new UserError("Task title is required.");
  assertValidPriority(data.priority);

  // Anyone can add a General task; project tasks need task:create there
  // (admins, project and team leads, or a grant).
  const projectId = data.projectId?.trim() || null;
  const employee = projectId ? await requireAuth("task:create", projectId) : await getCurrentEmployee();
  const { ownerId, assigneeIds } = ownerAndAssignees(data.ownerId, uniqueIds(data.assigneeIds));
  await assertAssignable(projectId, assigneeIds, [], { outside: data.outside });
  const startDate = toDate(data.startDate);
  const dueDate = toDate(data.dueDate);
  if (startDate && dueDate && dueDate < startDate) throw new UserError("The due date is before the start date.");

  // New tasks go to the top of To Do
  const firstTask = await db.task.findFirst({
    where: { projectId, status: "TODO" },
    orderBy: { order: "asc" },
    select: { order: true }
  });
  const initialOrder = firstTask ? firstTask.order - 1000 : 1000;

  const task = await db.$transaction(async (tx) => tx.task.create({
    data: {
      number: await nextTaskNumber(tx, projectId),
      title: data.title.trim(),
      description: data.description?.trim() || null,
      projectId,
      creatorId: employee.id,
      status: "TODO",
      priority: data.priority,
      order: initialOrder,
      startDate,
      dueDate,
      ownerId,
      assignees: assigneeIds.length > 0 ? { connect: assigneeIds.map(id => ({ id })) } : undefined,
    }
  }));

  await notifyAssigned(task.id, task.title, assigneeIds, employee, "New Task Assigned");
  audit({ actorId: employee.id, entity: "Task", entityId: task.id, action: "create", changes: { title: task.title, projectId: task.projectId, ownerId, assigneeIds } });

  revalidateTaskViews(task);
  return { success: true, taskId: task.id };
}

export async function updateTaskAction(taskId: string, data: {
  title: string;
  /** null moves it to General; undefined keeps the project. */
  projectId?: string | null;
  description?: string;
  assigneeIds?: string[];
  ownerId?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  startDate?: Date;
  dueDate?: Date;
  outside?: boolean;
}) {
  if (!data.title?.trim()) throw new UserError("Task title is required.");
  assertValidPriority(data.priority);

  const employee = await getCurrentEmployee();
  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    include: taskAccessInclude,
  });
  if (!existingTask) throw new UserError("Task not found");

  const hasGlobalPerm = await checkPermission("task:update", existingTask.projectId ?? undefined);
  if (!hasGlobalPerm) {
    const isAssignee = existingTask.assignees.some(a => a.id === employee.id);
    if (existingTask.creatorId !== employee.id && !isAssignee) {
      throw new UserError("You do not have permission to edit this task's details.");
    }
  }

  const projectId = data.projectId === undefined ? existingTask.projectId : data.projectId || null;
  if (projectId !== existingTask.projectId) {
    // Moving into a project needs task:create rights there; anyone may move a task to General.
    if (projectId && !(await checkPermission("task:create", projectId)) && !(await checkPermission("task:update", projectId))) {
      throw new UserError("You do not have permission to move tasks into that project.");
    }
    if (existingTask.parentId) throw new UserError("Subtasks stay in their parent's project. Move the parent task instead.");
  }

  const { ownerId, assigneeIds } = ownerAndAssignees(data.ownerId, uniqueIds(data.assigneeIds));
  const sameProject = projectId === existingTask.projectId;
  await assertAssignable(projectId, assigneeIds, sameProject ? existingTask.assignees.map(a => a.id) : [], { outside: data.outside });

  const next = {
    title: data.title.trim(),
    description: data.description,
    projectId,
    priority: data.priority,
    startDate: toDate(data.startDate),
    dueDate: toDate(data.dueDate),
    ownerId,
  };
  if (next.startDate && next.dueDate && next.dueDate < next.startDate) throw new UserError("The due date is before the start date.");

  // Moving to another project takes the next number there.
  const updatedTask = await db.$transaction(async (tx) => tx.task.update({
    where: { id: taskId },
    data: {
      ...next,
      ...(sameProject ? {} : { number: await nextTaskNumber(tx, projectId) }),
      assignees: { set: assigneeIds.map(id => ({ id })) },
    },
  }));

  const previousIds = existingTask.assignees.map(a => a.id);
  await notifyAssigned(taskId, updatedTask.title, assigneeIds.filter(id => !previousIds.includes(id)), employee);
  audit({
    actorId: employee.id, entity: "Task", entityId: taskId, action: "update",
    changes: { ...(diffFields(existingTask, next) as object), ...(previousIds.sort().join() !== [...assigneeIds].sort().join() ? { assigneeIds: [previousIds, assigneeIds] } : {}) },
  });

  revalidateTaskViews(updatedTask);
  if (!sameProject) revalidatePath(`/projects/${existingTask.projectId}`);
  return { success: true, taskId: updatedTask.id };
}

/** Move a task on the board. Moving to Done needs `doneNote`: what was done. */
export async function updateTaskStatusAction(taskId: string, newStatus: string, newOrder?: number, doneNote?: string) {
  assertValidStatus(newStatus);
  if (newOrder !== undefined && (typeof newOrder !== "number" || isNaN(newOrder))) {
    throw new UserError("Invalid task order value");
  }

  const employee = await getCurrentEmployee();
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: taskAccessInclude,
  });
  if (!task) throw new UserError("Task not found");

  const hasGlobalPerm = await checkPermission("task:update", task.projectId ?? undefined);
  if (!hasGlobalPerm && !isInvolved(task, employee.id)) {
    throw new UserError("You do not have permission for this action.");
  }

  const becomingDone = newStatus === "DONE" && task.status !== "DONE";
  const note = becomingDone ? assertDoneNote(doneNote) : undefined;
  if (becomingDone) {
    const openSubtasks = await db.task.count({ where: { parentId: taskId, status: { notIn: ["DONE", "CANCELLED"] } } });
    if (openSubtasks > 0) {
      throw new UserError(`${openSubtasks} subtask${openSubtasks === 1 ? " is" : "s are"} still open. Finish or cancel ${openSubtasks === 1 ? "it" : "them"} first.`);
    }
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: newStatus,
      ...(newOrder !== undefined ? { order: newOrder } : {}),
      // Keep the original completion time and note when a Done task is only reordered.
      completedAt: newStatus === "DONE" ? (task.status === "DONE" ? task.completedAt : new Date()) : null,
      completionNote: newStatus === "DONE" ? (becomingDone ? note : undefined) : null,
      cancelledAt: null,
      cancelReason: null,
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
    // Reopening keeps the old note in the history.
    audit({
      actorId: employee.id, entity: "Task", entityId: taskId, action: "status",
      changes: { status: [task.status, newStatus], ...(note ? { doneNote: note } : {}), ...(task.status === "DONE" && task.completionNote ? { previousDoneNote: task.completionNote } : {}) },
    });
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
  if (!existingTask) throw new UserError("Task not found");

  const hasGlobalPerm = await checkPermission("task:update", existingTask.projectId ?? undefined);
  if (!hasGlobalPerm && !isInvolved(existingTask, employee.id)) {
    throw new UserError("You do not have permission for this action.");
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
  if (!task) throw new UserError("Task not found");

  const hasGlobalPerm = await checkPermission("task:update", task.projectId ?? undefined);
  if (!hasGlobalPerm && !isInvolved(task, employee.id)) {
    throw new UserError("You do not have permission for this action.");
  }

  if (blockerTaskId) {
    if (blockerTaskId === taskId) throw new UserError("A task can't block itself.");
    const blocker = await db.task.findUnique({ where: { id: blockerTaskId }, select: { projectId: true, blockedById: true } });
    if (!blocker || blocker.projectId !== task.projectId) throw new UserError("The blocker must be a task in the same project.");
    // Follow the blocker's own chain: if it leads back here, the tasks would wait on each other forever.
    let next = blocker.blockedById;
    for (let hops = 0; next && hops < 50; hops++) {
      if (next === taskId) throw new UserError("That would make a loop: the chosen task already waits on this one. Remove one of the blockers first.");
      next = (await db.task.findUnique({ where: { id: next }, select: { blockedById: true } }))?.blockedById ?? null;
    }
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
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assigneeIds?: string[];
  /** @deprecated use assigneeIds */
  assigneeId?: string;
  dueDate?: string | Date | null;
  outside?: boolean;
}) {
  if (!data.title?.trim()) throw new UserError("Subtask title is required.");
  assertValidPriority(data.priority);

  const employee = await getCurrentEmployee();
  const parentTask = await db.task.findUnique({
    where: { id: parentId },
    include: taskAccessInclude,
  });
  if (!parentTask) throw new UserError("Parent task not found");
  if (parentTask.parentId) throw new UserError("Subtasks can't have their own subtasks. Add it to the main task instead.");
  if (parentTask.status === "DONE" || parentTask.status === "CANCELLED") throw new UserError("This task is closed. Reopen it to add subtasks.");

  const { ownerId, assigneeIds } = ownerAndAssignees(null, uniqueIds(data.assigneeIds ?? (data.assigneeId ? [data.assigneeId] : [])));
  const hasGlobalPerm = await checkPermission("task:create", parentTask.projectId ?? undefined);
  if (!hasGlobalPerm) {
    if (!isInvolved(parentTask, employee.id)) throw new UserError("You do not have permission for this action.");
    // Without task:create, you can only assign the subtask to yourself.
    if (assigneeIds.some(id => id !== employee.id)) {
      throw new UserError("You can only assign this subtask to yourself.");
    }
  }
  await assertAssignable(parentTask.projectId, assigneeIds, [], { outside: data.outside });

  const dueDate = toDate(data.dueDate);
  if (dueDate && parentTask.dueDate && dueDate > parentTask.dueDate) {
    throw new UserError(`A subtask can't be due after its parent (${parentTask.dueDate.toISOString().slice(0, 10)}).`);
  }

  const subtask = await db.$transaction(async (tx) => tx.task.create({
    data: {
      number: await nextTaskNumber(tx, parentTask.projectId),
      title: data.title.trim(),
      description: data.description?.trim() || null,
      projectId: parentTask.projectId,
      parentId,
      creatorId: employee.id,
      status: "TODO",
      priority: data.priority,
      dueDate,
      ownerId,
      assignees: assigneeIds.length > 0 ? { connect: assigneeIds.map(id => ({ id })) } : undefined,
    }
  }));

  await notifyAssigned(subtask.id, subtask.title, assigneeIds, employee);
  audit({ actorId: employee.id, entity: "Task", entityId: subtask.id, action: "create", changes: { title: subtask.title, parentId, assigneeIds } });

  revalidateTaskViews(subtask);
  return { success: true, subtask };
}

/** Replace a task's assignees. Only people on the project (or its team) can be added. */
export async function setTaskAssigneesAction(taskId: string, assigneeIdsInput: string[], opts: { outside?: boolean } = {}) {
  const employee = await getCurrentEmployee();
  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    include: taskAccessInclude,
  });
  if (!existingTask) throw new UserError("Task not found");

  const canAssign =
    (await checkPermission("task:assign", existingTask.projectId ?? undefined)) ||
    (await checkPermission("task:update", existingTask.projectId ?? undefined)) ||
    existingTask.creatorId === employee.id;
  if (!canAssign) throw new UserError("You do not have permission to assign this task.");

  const assigneeIds = uniqueIds(assigneeIdsInput);
  const previousIds = existingTask.assignees.map(a => a.id);
  await assertAssignable(existingTask.projectId, assigneeIds, previousIds, opts);
  // The Owner stays while still assigned; otherwise the first assignee takes over.
  const ownerId = existingTask.ownerId && assigneeIds.includes(existingTask.ownerId) ? existingTask.ownerId : assigneeIds[0] ?? null;

  const task = await db.task.update({
    where: { id: taskId },
    data: { ownerId, assignees: { set: assigneeIds.map(id => ({ id })) } },
  });

  await notifyAssigned(task.id, task.title, assigneeIds.filter(id => !previousIds.includes(id)), employee);
  audit({ actorId: employee.id, entity: "Task", entityId: taskId, action: "assign", changes: { assigneeIds: [previousIds, assigneeIds] } });

  revalidateTaskViews(task);
  return { success: true, task };
}

/** Make one assignee (or anyone assignable) the Owner; they're added as an assignee. */
export async function setTaskOwnerAction(taskId: string, ownerId: string) {
  await changeTaskOwner(taskId, ownerId, true);
  return { success: true };
}

/**
 * Change the Owner. `notify: false` skips the notification so bulk edit can
 * send one summary instead of one per task. Returns whether the Owner changed.
 */
async function changeTaskOwner(taskId: string, ownerId: string, notify: boolean) {
  const employee = await getCurrentEmployee();
  const existingTask = await db.task.findUnique({ where: { id: taskId }, include: taskAccessInclude });
  if (!existingTask) throw new UserError("Task not found");

  const canAssign =
    (await checkPermission("task:assign", existingTask.projectId ?? undefined)) ||
    (await checkPermission("task:update", existingTask.projectId ?? undefined)) ||
    existingTask.creatorId === employee.id;
  if (!canAssign) throw new UserError("You do not have permission to change this task's owner.");

  const previousIds = existingTask.assignees.map(a => a.id);
  await assertAssignable(existingTask.projectId, [ownerId], previousIds);

  const task = await db.task.update({
    where: { id: taskId },
    data: { ownerId, assignees: previousIds.includes(ownerId) ? undefined : { connect: { id: ownerId } } },
  });
  const changed = ownerId !== existingTask.ownerId;
  if (notify) await notifyAssigned(task.id, task.title, changed ? [ownerId] : [], employee, "You Own a Task");
  audit({ actorId: employee.id, entity: "Task", entityId: taskId, action: "owner", changes: { ownerId: [existingTask.ownerId, ownerId] } });
  revalidateTaskViews(task);
  return changed;
}

/** Take a task off the board with a reason; open subtasks are cancelled with it. */
export async function cancelTaskAction(taskId: string, reason: string) {
  const text = reason?.trim() ?? "";
  if (text.length < 3) throw new UserError("Say why the task is cancelled.");
  const employee = await getCurrentEmployee();
  const task = await db.task.findUnique({ where: { id: taskId }, include: taskAccessInclude });
  if (!task) throw new UserError("Task not found");
  if (task.status === "CANCELLED") return { success: true };
  const allowed = (await checkPermission("task:update", task.projectId ?? undefined)) || task.creatorId === employee.id || task.ownerId === employee.id;
  if (!allowed) throw new UserError("Only the task's owner, its creator or a project lead can cancel it.");

  const now = new Date();
  await db.$transaction([
    db.task.update({ where: { id: taskId }, data: { status: "CANCELLED", cancelledAt: now, cancelReason: text, completedAt: null } }),
    db.task.updateMany({ where: { parentId: taskId, status: { notIn: ["DONE", "CANCELLED"] } }, data: { status: "CANCELLED", cancelledAt: now, cancelReason: text } }),
    // Nothing waits on a cancelled task.
    db.task.updateMany({ where: { blockedById: taskId }, data: { blockedById: null } }),
  ]);
  audit({ actorId: employee.id, entity: "Task", entityId: taskId, action: "cancel", changes: { status: [task.status, "CANCELLED"], reason: text } });
  revalidateTaskViews(task);
  return { success: true };
}

/** Bring a cancelled task back to To Do. */
export async function restoreTaskAction(taskId: string) {
  const employee = await getCurrentEmployee();
  const task = await db.task.findUnique({ where: { id: taskId }, include: taskAccessInclude });
  if (!task) throw new UserError("Task not found");
  if (task.status !== "CANCELLED") return { success: true };
  const allowed = (await checkPermission("task:update", task.projectId ?? undefined)) || task.creatorId === employee.id || task.ownerId === employee.id;
  if (!allowed) throw new UserError("Only the task's owner, its creator or a project lead can restore it.");
  if (task.parentId) {
    const parent = await db.task.findUnique({ where: { id: task.parentId }, select: { status: true } });
    if (parent && (parent.status === "CANCELLED" || parent.status === "DONE")) throw new UserError("Restore or reopen the main task first.");
  }

  await db.task.update({ where: { id: taskId }, data: { status: "TODO", cancelledAt: null, cancelReason: null } });
  audit({ actorId: employee.id, entity: "Task", entityId: taskId, action: "restore", changes: { status: ["CANCELLED", "TODO"], reason: task.cancelReason } });
  revalidateTaskViews(task);
  return { success: true };
}

/** Single-assignee shortcut kept for existing callers. */
export async function assignTaskAction(taskId: string, assigneeId: string | null) {
  return setTaskAssigneesAction(taskId, assigneeId ? [assigneeId] : []);
}


export async function deleteTaskAction(taskId: string) {
  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, projectId: true, parentId: true, creatorId: true },
  });
  if (!existingTask) throw new UserError("Task not found");

  // Admins, project/team leads and grant holders; a General task's creator too.
  const me = await getCurrentEmployee();
  const allowed = (await checkPermission("task:delete", existingTask.projectId ?? undefined)) || (!existingTask.projectId && existingTask.creatorId === me.id);
  if (!allowed) throw new UserError("You do not have permission to delete this task.");
  const employee = me;
  await db.task.delete({ where: { id: taskId } });

  audit({ actorId: employee.id, entity: "Task", entityId: taskId, action: "delete", changes: { title: existingTask.title, projectId: existingTask.projectId } });
  revalidateTaskViews(existingTask);
  return { success: true };
}

export async function rebalanceColumnTasksAction(orderedTaskIds: string[]) {
  const hasGlobalPerm = await checkPermission("task:update");
  if (!hasGlobalPerm) throw new UserError("You do not have permission for this action.");

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

export type BulkTaskChange =
  | { kind: "status"; status: string; doneNote?: string }
  | { kind: "priority"; priority: string }
  | { kind: "owner"; ownerId: string }
  | { kind: "dueDate"; dueDate: string | null };

/**
 * Apply one change to many tasks. Each task is checked on its own, using the
 * same rules as the single-task actions; ones you can't change are skipped
 * and counted, so one locked task doesn't block the rest.
 */
export async function bulkUpdateTasksAction(taskIds: string[], change: BulkTaskChange) {
  const ids = uniqueIds(taskIds).slice(0, 200);
  if (ids.length === 0) throw new UserError("Select at least one task.");
  if (change.kind === "status" && change.status === "DONE") assertDoneNote(change.doneNote);

  let updated = 0;
  const skipped: string[] = [];
  const newlyOwned: string[] = [];
  for (const id of ids) {
    try {
      if (change.kind === "status") await updateTaskStatusAction(id, change.status, undefined, change.doneNote);
      else if (change.kind === "priority") await updateTaskPriorityAction(id, change.priority);
      else if (change.kind === "owner") { if (await changeTaskOwner(id, change.ownerId, false)) newlyOwned.push(id); }
      else await setTaskDueDateAction(id, change.dueDate);
      updated++;
    } catch (err) {
      skipped.push(err instanceof UserError ? err.message : "Couldn't be changed.");
    }
  }
  if (change.kind === "owner" && newlyOwned.length) await notifyOwnerOfMany(newlyOwned, change.ownerId);
  return { updated, skipped: skipped.length, firstReason: skipped[0] ?? null };
}

/** One notification and one email for many tasks given to the same Owner. */
async function notifyOwnerOfMany(taskIds: string[], ownerId: string) {
  const actor = await getCurrentEmployee();
  if (ownerId === actor.id) return;
  if (taskIds.length === 1) {
    const task = await db.task.findUnique({ where: { id: taskIds[0] }, select: { title: true } });
    if (task) await notifyAssigned(taskIds[0], task.title, [ownerId], actor, "You Own a Task");
    return;
  }
  await db.notification.create({
    data: {
      recipientId: ownerId,
      type: "TASK_ASSIGNED",
      title: "You Own Tasks",
      message: `${actor.firstName} ${actor.lastName} made you the owner of ${taskIds.length} tasks.`,
      actionUrl: "/tasks/my",
    },
  });
  emailTasksOwned(taskIds, ownerId, `${actor.firstName} ${actor.lastName}`);
}

/** Set or clear a task's due date ("YYYY-MM-DD" or null). */
export async function setTaskDueDateAction(taskId: string, dueDate: string | null) {
  const employee = await getCurrentEmployee();
  const task = await db.task.findUnique({ where: { id: taskId }, include: { ...taskAccessInclude, parent: { select: { dueDate: true } } } });
  if (!task) throw new UserError("Task not found");
  const allowed = (await checkPermission("task:update", task.projectId ?? undefined)) || task.creatorId === employee.id;
  if (!allowed) throw new UserError("You do not have permission to change this task's due date.");

  const due = dueDate ? new Date(`${dueDate}T23:59:59.999`) : null;
  if (due && isNaN(due.getTime())) throw new UserError("Invalid date.");
  if (due && task.startDate && due < task.startDate) throw new UserError("The due date is before the start date.");
  if (due && task.parent?.dueDate && due > task.parent.dueDate) throw new UserError("A subtask can't be due after its main task.");

  const updated = await db.task.update({ where: { id: taskId }, data: { dueDate: due } });
  audit({ actorId: employee.id, entity: "Task", entityId: taskId, action: "update", changes: { dueDate: [task.dueDate, due] } });
  revalidateTaskViews(updated);
  return { success: true };
}
