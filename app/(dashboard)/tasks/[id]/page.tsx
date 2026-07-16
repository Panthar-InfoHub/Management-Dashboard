import { getTaskById, getKanbanTasks } from "@/lib/queries/task.queries";
import { notFound } from "next/navigation";
import { TaskDetailClient } from "@/components/tasks/task-detail-client";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTaskById(id);

  if (!task) {
    notFound();
  }

  // Fetch all tasks to use as potential blockers
  const allTasks = await getKanbanTasks();
  const projectTasks = allTasks.filter(t => t.projectId === task.projectId && t.id !== task.id);

  return <TaskDetailClient initialTask={task} projectTasks={projectTasks} />;
}
