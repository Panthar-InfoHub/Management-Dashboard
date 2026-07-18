import { db } from "@/lib/db";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { NewTaskForm } from "@/components/tasks/new-task-form";

import { redirect } from "next/navigation";

export default async function NewTaskPage() {
  const employee = await getCurrentEmployee();

  const canCreate = await checkPermission("task:create");
  if (!canCreate) {
    redirect("/");
  }

  const canSeeAllProjects = await checkPermission("project:update");

  const projectWhereClause = canSeeAllProjects ? {
    status: { not: "COMPLETED" as const }
  } : {
    status: { not: "COMPLETED" as const },
    members: { some: { employeeId: employee.id } }
  };

  // Fetch projects the user can assign tasks to, and active employees to act as assignees
  const [projects, employees] = await Promise.all([
    db.project.findMany({
      where: projectWhereClause,
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" }
    })
  ]);

  return <NewTaskForm projects={projects} employees={employees} />;
}
