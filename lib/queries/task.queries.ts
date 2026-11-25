import { UserError } from "@/lib/errors";
import { db } from "@/lib/db";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { parseTaskKey } from "@/lib/tasks/keys";

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

export async function getKanbanTasks(filters?: TaskFilters, skip = 0, take = 100) {
  const employee = await getCurrentEmployee();

  const canViewAll = await checkPermission("task:update");
  
  // For the Kanban board, fetch tasks the user has access to. Admins see all tasks.
  // Admins and people with task:update see everything. Others see their
  // projects' tasks, and tasks they're assigned to or created (this is how
  // General tasks stay private to the people on them).
  const accessClause = canViewAll ? {} : {
    OR: [
      { project: { members: { some: { employeeId: employee.id } } } },
      { assignees: { some: { id: employee.id } } },
      { creatorId: employee.id },
    ]
  };

  const AND: any[] = [];
  if (Object.keys(accessClause).length > 0) AND.push(accessClause);

  if (filters?.team && filters.team !== "ALL") {
    AND.push({ project: { teamId: filters.team } });
  }
  if (filters?.project && filters.project !== "ALL") {
    AND.push({ projectId: filters.project === GENERAL_FILTER ? null : filters.project });
  }
  if (filters?.assignee && filters.assignee !== "ALL") {
    if (filters.assignee === "UNASSIGNED") {
      AND.push({ assignees: { none: {} } });
    } else {
      AND.push({ assignees: { some: { id: filters.assignee } } });
    }
  }
  if (filters?.search) {
    // "JNV-24" finds that task; anything else searches titles.
    const key = parseTaskKey(filters.search);
    AND.push(key
      ? { number: key.number, project: { key: key.key } }
      : { title: { contains: filters.search, mode: "insensitive" } });
  }
  // The board shows main tasks; subtasks live on their task unless asked for.
  if (filters?.subtasks !== "1" && !filters?.search) AND.push({ parentId: null });
  if (filters?.cancelled !== "1") AND.push({ status: { not: "CANCELLED" } });

  const whereClause = AND.length > 0 ? { AND } : {};

  const tasks = await db.task.findMany({
    where: whereClause,
    skip,
    take,
    include: {
      assignees: { select: personSelect },
      owner: { select: personSelect },
      project: {
        select: {
          id: true,
          name: true,
          key: true,
          team: { select: { id: true, name: true } }
        }
      },
      parent: { select: { id: true, title: true, number: true } },
      // Subtask progress for the card ("2/5"): open + done ones, cancelled don't count.
      subtasks: { where: { status: { not: "CANCELLED" } }, select: { id: true, status: true } },
    },
    orderBy: [
      { order: "asc" },
      { updatedAt: "desc" }
    ]
  });

  return tasks;
}

export async function getTaskById(taskId: string, callerEmployee?: any, canUpdate?: boolean) {
  const employee = callerEmployee ?? (await getCurrentEmployee());

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: { 
          team: true, 
          members: {
            include: {
              employee: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true }
              }
            }
          } 
        }
      },
      assignees: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true }
      },
      owner: { select: personSelect },
      parent: { select: { id: true, title: true, number: true } },
      creator: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true }
      },
      subtasks: {
        select: {
          id: true, title: true, status: true, priority: true, dueDate: true, parentId: true, number: true, ownerId: true,
          assignees: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      comments: {
        select: {
          id: true, content: true, createdAt: true, editedAt: true,
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 200,
      },
      blockedBy: {
        select: { id: true, title: true, status: true }
      }
    }
  });

  if (!task) return null;

  const canViewAll = canUpdate !== undefined ? canUpdate : await checkPermission("task:update");

  if (!canViewAll) {
    const isAssignee = task.assignees?.some(a => a.id === employee.id);
    const isProjectMember = task.project?.members?.some(m => m.employeeId === employee.id);
    const isCreator = task.creatorId === employee.id;
    
    if (!isAssignee && !isProjectMember && !isCreator) {
      throw new UserError("FORBIDDEN: Requires higher permission level");
    }
  }

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
