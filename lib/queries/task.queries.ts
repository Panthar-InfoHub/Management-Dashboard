import { UserError } from "@/lib/errors";
import { db } from "@/lib/db";
import { type AuthEmployee, getCurrentEmployee, checkPermission } from "@/lib/auth";

export type TaskFilters = {
  team?: string;
  project?: string;
  assignee?: string;
  search?: string;
  /** "1": show subtasks as their own cards too. */
  subtasks?: string;
  /** "1": include cancelled tasks. */
  cancelled?: string;
};

/** Project filter value for General tasks (no project). */
export const GENERAL_FILTER = "GENERAL";

const personSelect = { id: true, firstName: true, lastName: true, avatarUrl: true } as const;

const boardSelect = {
  id: true, title: true, status: true, priority: true, order: true, dueDate: true, number: true, projectId: true,
  parentId: true, ownerId: true, updatedAt: true, completedAt: true,
  assignees: { select: personSelect },
  owner: { select: personSelect },
  project: { select: { id: true, name: true, key: true, team: { select: { id: true, name: true } } } },
  parent: { select: { id: true, title: true, number: true } },
  // Subtask progress for the card ("2/5"); cancelled ones don't count.
  subtasks: { where: { status: { not: "CANCELLED" } }, select: { id: true, status: true } },
  _count: { select: { comments: true } },
} as const;

/**
 * Everything the board needs in one go, so every filter runs in the browser
 * with no round trip: all open tasks and subtasks, plus the latest Done and
 * Cancelled ones (older closed work lives in the list and search).
 */
export async function getKanbanTasks(_filters?: TaskFilters) {
  const employee = await getCurrentEmployee();
  const canViewAll = await checkPermission("task:update");

  // Admins and people with task:update see everything. Others see their
  // projects' tasks, and tasks they're assigned to or created (this is how
  // General tasks stay private to the people on them).
  const access = canViewAll ? {} : {
    OR: [
      { project: { members: { some: { employeeId: employee.id } } } },
      { assignees: { some: { id: employee.id } } },
      { creatorId: employee.id },
    ],
  };

  const [open, done, cancelled] = await Promise.all([
    db.task.findMany({ where: { ...access, status: { in: ["TODO", "IN_PROGRESS", "REVIEW", "TESTING"] } }, select: boardSelect, orderBy: [{ order: "asc" }, { updatedAt: "desc" }] }),
    db.task.findMany({ where: { ...access, status: "DONE" }, select: boardSelect, orderBy: { completedAt: { sort: "desc", nulls: "last" } }, take: 60 }),
    db.task.findMany({ where: { ...access, status: "CANCELLED" }, select: boardSelect, orderBy: { updatedAt: "desc" }, take: 30 }),
  ]);
  return [...open, ...done, ...cancelled];
}

export type BoardTask = Awaited<ReturnType<typeof getKanbanTasks>>[number];

/** Everything the task page shows, in one query. No access check: use canViewTask. */
export async function loadTaskDetail(taskId: string) {
  return db.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: {
          id: true, name: true, key: true, leadId: true,
          team: { select: { id: true, name: true } },
          members: { select: { employeeId: true } },
        },
      },
      assignees: { select: personSelect },
      owner: { select: personSelect },
      parent: { select: { id: true, title: true, number: true, dueDate: true, project: { select: { key: true } } } },
      creator: { select: personSelect },
      comments: {
        select: { id: true, content: true, createdAt: true, editedAt: true, author: { select: personSelect } },
        orderBy: { createdAt: "asc" },
        take: 200,
      },
      blockedBy: { select: { id: true, title: true, status: true, number: true, projectId: true } },
    },
  });
}

export type TaskDetail = NonNullable<Awaited<ReturnType<typeof loadTaskDetail>>>;

/** Who may open a task: anyone with task:update, or the assignees, project members and creator. */
export function canViewTask(task: TaskDetail, employeeId: string, canViewAll: boolean) {
  return canViewAll
    || task.creatorId === employeeId
    || task.assignees.some((a) => a.id === employeeId)
    || (task.project?.members.some((m) => m.employeeId === employeeId) ?? false);
}

export async function getTaskById(taskId: string, callerEmployee?: AuthEmployee, canUpdate?: boolean) {
  const employee = callerEmployee ?? (await getCurrentEmployee());
  const task = await loadTaskDetail(taskId);
  if (!task) return null;
  const canViewAll = canUpdate !== undefined ? canUpdate : await checkPermission("task:update");
  if (!canViewTask(task, employee.id, canViewAll)) throw new UserError("FORBIDDEN: Requires higher permission level");
  return task;
}

export async function getTaskFilterDropdowns() {
  const employee = await getCurrentEmployee();
  const canViewAll = await checkPermission("project:update");

  const [projects, teams, employees] = await Promise.all([
    db.project.findMany({
      where: canViewAll ? {} : {
        OR: [
          { members: { some: { employeeId: employee.id } } },
          { leadId: employee.id }
        ]
      },
      select: { id: true, name: true, teamId: true },
      orderBy: { name: "asc" }
    }),
    db.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      orderBy: { firstName: "asc" }
    })
  ]);

  return { projects, teams, employees };
}

/** A task's subtasks (one level). */
export async function getSubtasks(taskId: string) {
  return db.task.findMany({
    where: { parentId: taskId },
    select: {
      id: true, title: true, status: true, priority: true, dueDate: true, parentId: true, number: true, ownerId: true,
      assignees: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

const myTaskSelect = {
  id: true, title: true, status: true, priority: true, dueDate: true, number: true, projectId: true, ownerId: true,
  project: { select: { id: true, name: true, key: true } },
  parent: { select: { id: true, title: true } },
  owner: { select: personSelect },
} as const;

/** Open tasks and subtasks assigned to you, and tasks waiting for your review as a lead. */
export async function getMyTasks() {
  const me = await getCurrentEmployee();
  const open = { notIn: ["DONE", "CANCELLED"] as ("DONE" | "CANCELLED")[] };
  const [assigned, toReview] = await Promise.all([
    db.task.findMany({
      where: { assignees: { some: { id: me.id } }, status: open },
      select: myTaskSelect,
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      take: 300,
    }),
    db.task.findMany({
      where: { status: "REVIEW", project: { OR: [{ leadId: me.id }, { team: { leadId: me.id } }] } },
      select: myTaskSelect,
      orderBy: { updatedAt: "asc" },
      take: 100,
    }),
  ]);
  return { meId: me.id, assigned, toReview };
}
