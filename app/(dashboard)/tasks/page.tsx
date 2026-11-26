import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getKanbanTasks, getTaskFilterDropdowns } from "@/lib/queries/task.queries";
import { KanbanBoard } from "@/components/tasks/kanban-board";

import { getCurrentEmployee } from "@/lib/auth";

import { Suspense } from "react";
import { PageHeader } from "@/components/ui/panel";
import { TasksBodySkeleton } from "./skeleton";

async function TasksDataAsync() {
  // Dropdown options load in parallel with the tasks.
  const filterOptionsPromise = getTaskFilterDropdowns();

  // Filters run in the browser, so the URL doesn't change what loads.
  const employee = await getCurrentEmployee();
  const [tasks, filterOptions] = await Promise.all([
    getKanbanTasks(),
    filterOptionsPromise,
  ]);

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      <KanbanBoard 
        initialTasks={tasks} 
        allowedProjects={filterOptions.projects} 
        allowedTeams={filterOptions.teams} 
        allEmployees={filterOptions.employees}
        currentEmployeeId={employee.id}
      />
    </div>
  );
}

export default function TasksPage() {
  // The shell renders at once; the board streams in.
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 h-full min-h-0">
      <PageHeader
        title="Tasks"
        description="Every task you can see, across projects and General."
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href="/tasks/my">My Tasks</Link></Button>
            <Button asChild size="sm" className="gap-1.5"><Link href="/tasks/new"><Plus className="h-3.5 w-3.5" /> New Task</Link></Button>
          </>
        }
      />
      <Suspense fallback={<TasksBodySkeleton />}>
        <TasksDataAsync />
      </Suspense>
    </div>
  );
}
