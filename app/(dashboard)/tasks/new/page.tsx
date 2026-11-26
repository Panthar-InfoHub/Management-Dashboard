import { db } from "@/lib/db";
import { getAssignableIdsByProject, getGeneralAssignable, getOutsideAllowed } from "@/lib/tasks/assignees";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { NewTaskForm } from "@/components/tasks/new-task-form";


export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { project: defaultProject } = await searchParams;
  const employee = await getCurrentEmployee();

  // Anyone with task:create can add tasks anywhere; project and team leads
  // (managers) can add them to the projects they lead.
  const canCreate = await checkPermission("task:create");
  const ledProjects = { OR: [{ leadId: employee.id }, { team: { leadId: employee.id } }] };
  const projectWhereClause = canCreate
    ? { status: { not: "COMPLETED" as const } }
    : { status: { not: "COMPLETED" as const }, ...ledProjects };

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
  // Everyone can add General tasks, so the form opens even with no projects.
  const [assignableByProject, general, outsideAllowed] = await Promise.all([
    getAssignableIdsByProject(projects.map((p) => p.id)),
    getGeneralAssignable(),
    getOutsideAllowed(projects.map((p) => p.id)),
  ]);
  assignableByProject.GENERAL = general.map((e) => e.id);

  return <NewTaskForm projects={projects} employees={employees} assignableByProject={assignableByProject} outsideAllowed={outsideAllowed} defaultProject={projects.some((p) => p.id === defaultProject) ? defaultProject : undefined} />;
}
