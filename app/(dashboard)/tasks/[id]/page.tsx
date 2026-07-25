import { getTaskById } from "@/lib/queries/task.queries";
import { notFound } from "next/navigation";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { TaskDetailClient } from "@/components/tasks/task-detail-client";
import { db } from "@/lib/db";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [task, employee, canUpdateGlobal, canDelete] = await Promise.all([
    getTaskById(id),
    getCurrentEmployee(),
    checkPermission("task:update"),
    checkPermission("task:delete"),
  ]);

  if (!task) {
    notFound();
  }

  const isCreator = task.creatorId === employee.id;
  const canEditDetails = canUpdateGlobal || isCreator;
  const isAssignee = task.assignees?.some((a: { id: string }) => a.id === employee.id);
  const isProjectMember = task.project?.members?.some((m: { employeeId: string }) => m.employeeId === employee.id);
  const canEditStatus = canEditDetails || isAssignee || isProjectMember;

  // Only fetch tasks in the same project for the blocker dropdown — not ALL tasks
  const projectTasks = await db.task.findMany({
    where: { projectId: task.projectId, id: { not: task.id } },
    select: { id: true, title: true, status: true, projectId: true, priority: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return <TaskDetailClient initialTask={task} projectTasks={projectTasks} canEditDetails={canEditDetails} canEditStatus={canEditStatus} canDelete={canDelete} currentEmployeeId={employee.id} />;
}

