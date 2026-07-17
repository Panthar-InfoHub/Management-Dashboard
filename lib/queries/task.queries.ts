import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";

export async function getKanbanTasks(filters?: { team?: string, project?: string, assignee?: string, search?: string }, skip = 0, take = 50) {
  const employee = await getCurrentEmployee();

  // For the Kanban board, fetch tasks the user has access to. Admins see all tasks.
  let accessClause = (employee.role === "ADMIN" || employee.role === "MANAGER") ? {} : {
    OR: [
      { project: { members: { some: { employeeId: employee.id } } } },
      { assignees: { some: { id: employee.id } } },
      { creatorId: employee.id }
    ]
  };

  const AND: any[] = [];
  if (Object.keys(accessClause).length > 0) AND.push(accessClause);

  if (filters?.team && filters.team !== "ALL") {
    AND.push({ project: { teamId: filters.team } });
  }
  if (filters?.project && filters.project !== "ALL") {
    AND.push({ projectId: filters.project });
  }
  if (filters?.assignee && filters.assignee !== "ALL") {
    if (filters.assignee === "UNASSIGNED") {
      AND.push({ assignees: { none: {} } });
    } else {
      AND.push({ assignees: { some: { id: filters.assignee } } });
    }
  }
  if (filters?.search) {
    AND.push({ title: { contains: filters.search, mode: "insensitive" } });
  }

  const whereClause = AND.length > 0 ? { AND } : {};

  const tasks = await db.task.findMany({
    where: whereClause,
    skip,
    take,
    include: {
      assignees: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        }
      },
      project: {
        select: {
          id: true,
          name: true,
          team: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return tasks;
}

export async function getTaskById(taskId: string) {
  const employee = await getCurrentEmployee();

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: { 
          team: true, 
          members: { include: { employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } } 
        }
      },
      assignees: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true }
      },
      creator: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true }
      },
      subtasks: {
        include: { assignees: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } }
      },
      blockedBy: {
        select: { id: true, title: true, status: true }
      }
    }
  });

  if (!task) return null;

  // Authorization: Admin/Manager sees all. Otherwise, must be creator, assignee, or project member
  if (employee.role !== "ADMIN" && employee.role !== "MANAGER" && task.creatorId !== employee.id) {
    const isAssignee = task.assignees.some(a => a.id === employee.id);
    const isProjectMember = task.project.members.some(m => m.employeeId === employee.id);
    
    if (!isAssignee && !isProjectMember) {
      throw new Error("FORBIDDEN: Requires higher permission level");
    }
  }

  return { ...task, activity: [] };
}
