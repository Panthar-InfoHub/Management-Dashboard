import { getTaskById, getKanbanTasks } from "@/lib/queries/task.queries";
import { notFound } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth";
import { TaskDetailClient } from "@/components/tasks/task-detail-client";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTaskById(id);
  const employee = await getCurrentEmployee();
  const isAssignee = task?.assignees.some(a => a.id === employee.id);
  const isProjectMember = task?.project.members.some(m => m.employeeId === employee.id);
  const canEdit = employee.role === "ADMIN" || employee.role === "MANAGER" || isAssignee || isProjectMember;

  if (!task) {
    notFound();
  }

  // Fetch all tasks to use as potential blockers
  const allTasks = await getKanbanTasks();
  const projectTasks = allTasks.filter(t => t.projectId === task.projectId && t.id !== task.id);

  return <TaskDetailClient initialTask={task} projectTasks={projectTasks} canEdit={canEdit} />;
}
