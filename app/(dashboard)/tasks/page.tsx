import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getKanbanTasks } from "@/lib/queries/task.queries";
import { KanbanBoard } from "@/components/tasks/kanban-board";

export default async function TasksPage() {
  const tasks = await getKanbanTasks();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Track and manage all tasks across projects.</p>
        </div>
        <Button asChild size="sm" className="gap-2 text-xs">
          <Link href="/tasks/new">
            <Plus className="h-3.5 w-3.5" /> New Task
          </Link>
        </Button>
      </div>

      <KanbanBoard initialTasks={tasks} />
    </div>
  );
}
