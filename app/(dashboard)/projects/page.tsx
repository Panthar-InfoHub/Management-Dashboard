import { getProjectsList } from "@/lib/queries/project.queries";
import { ProjectsClient } from "@/components/projects/projects-client";

import { getCurrentEmployee, checkPermission } from "@/lib/auth";

export default async function ProjectsPage() {
  const employee = await getCurrentEmployee();
  const projects = await getProjectsList();

  const canCreate = await checkPermission("project:create");

  return <ProjectsClient initialProjects={projects} canCreate={canCreate} />;
}
