import { getTaskById, getSubtasks } from "@/lib/queries/task.queries";
import { notFound } from "next/navigation";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { getAssignableEmployees } from "@/lib/tasks/assignees";
import { TaskDetailClient } from "@/components/tasks/task-detail-client";
import { db } from "@/lib/db";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [employee, canUpdateGlobal] = await Promise.all([
    getCurrentEmployee(),
    checkPermission("task:update"),
  ]);

  const task = await getTaskById(id, employee, canUpdateGlobal);

  if (!task) {
    notFound();
  }

  // Checked for this task's project, so project and team leads (managers) get
  // edit, delete and cancel there too, not only admins.
  const [canUpdate, canDelete] = await Promise.all([
    checkPermission("task:update", task.projectId ?? undefined),
    checkPermission("task:delete", task.projectId ?? undefined),
  ]);
  const isCreator = task.creatorId === employee.id;
  const canEditDetails = canUpdate || isCreator;
  const canCancel = canUpdate || isCreator || task.ownerId === employee.id;
  const canDeleteTask = canDelete || (!task.projectId && isCreator);
  const isAssignee = task.assignees?.some((a: { id: string }) => a.id === employee.id);
  const isProjectMember = task.project?.members?.some((m: { employeeId: string }) => m.employeeId === employee.id);
  const canEditStatus = canEditDetails || isAssignee || isProjectMember;

  const [projectTasks, subtaskTree, assignableEmployees] = await Promise.all([
    // Only tasks in the same project for the blocker dropdown — not ALL tasks
    db.task.findMany({
      // General tasks only offer your own General tasks, so nobody sees others' titles.
      where: task.projectId
        ? { projectId: task.projectId, id: { not: task.id } }
        : { projectId: null, id: { not: task.id }, OR: [{ creatorId: employee.id }, { assignees: { some: { id: employee.id } } }] },
      select: { id: true, title: true, status: true, projectId: true, priority: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    getSubtasks(task.id),
    getAssignableEmployees(task.projectId),
  ]);

  return (
    <TaskDetailClient
      initialTask={task}
      projectTasks={projectTasks}
      subtaskTree={subtaskTree}
      assignableEmployees={assignableEmployees}
      canEditDetails={canEditDetails}
      canEditStatus={canEditStatus}
      canDelete={canDeleteTask}
      canCancel={canCancel}
      currentEmployeeId={employee.id}
    />
  );
}
