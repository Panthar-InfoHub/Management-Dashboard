import { getProjectsList } from "@/lib/queries/project.queries";
import { ProjectsClient } from "@/components/projects/projects-client";

import { getCurrentEmployee } from "@/lib/auth";

export default async function ProjectsPage() {
  const employee = await getCurrentEmployee();
  const projects = await getProjectsList();

  const canCreate = employee.role === "ADMIN" || employee.role === "MANAGER";

  return <ProjectsClient initialProjects={projects} canCreate={canCreate} />;
}
