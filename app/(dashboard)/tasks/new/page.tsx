import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";
import { NewTaskForm } from "@/components/tasks/new-task-form";

export default async function NewTaskPage() {
  const employee = await getCurrentEmployee();

  const projectWhereClause = employee.role === "ADMIN" ? {
    status: { not: "COMPLETED" as const }
  } : {
    status: { not: "COMPLETED" as const },
    members: { some: { employeeId: employee.id } }
  };

  // Fetch projects the user can assign tasks to
  const projects = await db.project.findMany({
    where: projectWhereClause,
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  // Fetch active employees to act as assignees
  const employees = await db.employee.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" }
  });

  return <NewTaskForm projects={projects} employees={employees} />;
}
