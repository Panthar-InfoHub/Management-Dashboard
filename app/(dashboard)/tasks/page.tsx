import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getKanbanTasks } from "@/lib/queries/task.queries";
import { getProjectsList } from "@/lib/queries/project.queries";
import { getTeams } from "@/lib/queries/team.queries";
import { getEmployees } from "@/lib/queries/employee.queries";
import { KanbanBoard } from "@/components/tasks/kanban-board";

import { getCurrentEmployee, checkPermission } from "@/lib/auth";

import { Suspense } from "react";
import TasksLoading from "./skeleton";

async function TasksData({ resolvedParams, employee, canEdit }: { resolvedParams: { [key: string]: string | undefined }, employee: any, canEdit: boolean }) {
  const [tasks, projects, teams, allEmployees] = await Promise.all([
    getKanbanTasks(resolvedParams),
    getProjectsList(),
    getTeams(),
    getEmployees()
  ]);

  return (
    <div className="flex flex-col gap-6 min-h-0 flex-1">
      <div className="flex items-center justify-end shrink-0">
        {canEdit && (
          <Button asChild size="sm" className="gap-2 text-xs">
            <Link href="/tasks/new">
              <Plus className="h-3.5 w-3.5" /> New Task
            </Link>
          </Button>
        )}
      </div>

      <KanbanBoard 
        initialTasks={tasks} 
        allowedProjects={projects} 
        allowedTeams={teams} 
        allEmployees={allEmployees}
        currentEmployeeId={employee.id}
        employeeRole={employee.role}
      />
    </div>
  );
}

export default function TasksPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  // Instantly return the page shell and stream the heavy kanban data
  return (
    <div className="flex flex-col gap-6 p-6 h-[calc(100vh-64px)] min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Track and manage all tasks across projects.</p>
        </div>
      </div>
      <Suspense fallback={<TasksLoading />}>
        <TasksDataAsync searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TasksDataAsync({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const [resolvedParams, employee, canEdit] = await Promise.all([
    searchParams,
    getCurrentEmployee(),
    checkPermission("task:create")
  ]);

  return <TasksData resolvedParams={resolvedParams} employee={employee} canEdit={canEdit} />;
}
