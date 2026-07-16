import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";

export async function getKanbanTasks() {
  const employee = await getCurrentEmployee();

  // For the Kanban board, fetch tasks the user has access to. Admins see all tasks.
  const whereClause = employee.role === "ADMIN" ? {} : {
    OR: [
      { project: { members: { some: { employeeId: employee.id } } } },
      { assignees: { some: { id: employee.id } } },
      { creatorId: employee.id }
    ]
  };

  const tasks = await db.task.findMany({
    where: whereClause,
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
          name: true,
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
        include: { team: true, members: true }
      },
      assignees: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true }
      },
      creator: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true }
      }
    }
  });

  if (!task) return null;

  // Authorization: Admin sees all. Otherwise, must be creator, assignee, or project member
  if (employee.role !== "ADMIN" && task.creatorId !== employee.id) {
    const isAssignee = task.assignees.some(a => a.id === employee.id);
    const isProjectMember = task.project.members.some(m => m.employeeId === employee.id);
    
    if (!isAssignee && !isProjectMember) {
      throw new Error("Unauthorized access to task");
    }
  }

  return task;
}
