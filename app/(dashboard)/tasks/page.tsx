import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getKanbanTasks } from "@/lib/queries/task.queries";
import { getProjectsList } from "@/lib/queries/project.queries";
import { getTeams } from "@/lib/queries/team.queries";
import { getEmployees } from "@/lib/queries/employee.queries";
import { KanbanBoard } from "@/components/tasks/kanban-board";

import { getCurrentEmployee } from "@/lib/auth";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const resolvedParams = await searchParams;
  
  const [tasks, projects, teams, allEmployees, employee] = await Promise.all([
    getKanbanTasks(resolvedParams),
    getProjectsList(),
    getTeams(),
    getEmployees(),
    getCurrentEmployee()
  ]);

  const canEdit = employee.role === "ADMIN" || employee.role === "MANAGER";

  return (
    <div className="flex flex-col gap-6 p-6 h-[calc(100vh-64px)] min-w-0 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Track and manage all tasks across projects.</p>
        </div>
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
