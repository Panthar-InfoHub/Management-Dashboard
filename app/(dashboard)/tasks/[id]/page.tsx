import { getTaskById } from "@/lib/queries/task.queries";
import { notFound } from "next/navigation";
import { TaskDetailClient } from "@/components/tasks/task-detail-client";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTaskById(id);

  if (!task) {
    notFound();
  }

  return <TaskDetailClient initialTask={task} />;
}
