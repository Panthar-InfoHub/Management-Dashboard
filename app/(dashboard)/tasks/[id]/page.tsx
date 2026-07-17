import { getTaskById, getKanbanTasks } from "@/lib/queries/task.queries";
import { notFound } from "next/navigation";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { TaskDetailClient } from "@/components/tasks/task-detail-client";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTaskById(id);
  const employee = await getCurrentEmployee();
  
  const canUpdateGlobal = await checkPermission("task:update");
  const isCreator = task?.creatorId === employee.id;
  const canEditDetails = canUpdateGlobal || isCreator;
  const isAssignee = task?.assignees?.some((a: any) => a.id === employee.id);
  const isProjectMember = task?.project?.members?.some((m: any) => m.employeeId === employee.id);
  const canEditStatus = canEditDetails || isAssignee || isProjectMember;
  const canDelete = await checkPermission("task:delete");

  if (!task) {
    notFound();
  }

  // Fetch all tasks to use as potential blockers
  const allTasks = await getKanbanTasks();
  const projectTasks = allTasks.filter(t => t.projectId === task.projectId && t.id !== task.id);

  return <TaskDetailClient initialTask={task} projectTasks={projectTasks} canEditDetails={canEditDetails} canEditStatus={canEditStatus} canDelete={canDelete} currentEmployeeId={employee.id} />;
}
