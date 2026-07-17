import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";
import { NewTaskForm } from "@/components/tasks/new-task-form";
import { notFound } from "next/navigation";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const employee = await getCurrentEmployee();
  const { id } = await params;

  const task = await db.task.findUnique({
    where: { id },
    include: {
      assignees: true,
      project: {
        include: { members: true }
      }
    }
  });

  if (!task) {
    notFound();
  }

  // Permission check
  const isAssignee = task.assignees.some(a => a.id === employee.id);
  const isProjectMember = task.project.members.some(m => m.employeeId === employee.id);
  const canEdit = employee.role === "ADMIN" || employee.role === "MANAGER" || isAssignee || isProjectMember;

  if (!canEdit) {
    notFound();
  }

  const projectWhereClause = employee.role === "ADMIN" || employee.role === "MANAGER" ? {
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

  return <NewTaskForm projects={projects} employees={employees} initialData={task} />;
}
