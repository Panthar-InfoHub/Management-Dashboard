import { db } from "@/lib/db";
import { getAssignableIdsByProject, getGeneralAssignable, getOutsideAllowed } from "@/lib/tasks/assignees";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { NewTaskForm } from "@/components/tasks/new-task-form";
import { notFound } from "next/navigation";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await getCurrentEmployee();

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

  // Permission check: Only users with global task:update or the creator can modify core details
  // For this project, so project and team leads can edit too.
  const canEditGlobal = await checkPermission("task:update", task.projectId ?? undefined);
  const isCreator = task.creatorId === employee.id;
  const isAssignee = task.assignees.some((a) => a.id === employee.id);
  const isProjectMember = task.project?.members.some((m) => m.employeeId === employee.id);

  if (!canEditGlobal && !isProjectMember && !isAssignee) {
    // If they don't have global edit and are NO LONGER part of the project/task, they lose all access
    notFound();
  }

  if (!canEditGlobal && !isCreator) {
    notFound();
  }

  const projectWhereClause = (await checkPermission("project:update")) ? {
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
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      orderBy: { firstName: "asc" }
    })
  ]);
  // Keep the task's own project in the list even if it's completed.
  if (task.project && !projects.some((p) => p.id === task.projectId)) projects.unshift({ id: task.project.id, name: task.project.name });
  const [assignableByProject, general, outsideAllowed] = await Promise.all([
    getAssignableIdsByProject(projects.map((p) => p.id)),
    getGeneralAssignable(),
    getOutsideAllowed(projects.map((p) => p.id)),
  ]);
  assignableByProject.GENERAL = general.map((e) => e.id);

  return <NewTaskForm projects={projects} employees={employees} assignableByProject={assignableByProject} outsideAllowed={outsideAllowed} initialData={task} canAssign={canEditGlobal} />;
}
