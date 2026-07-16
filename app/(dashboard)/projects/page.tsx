import { getProjectsList } from "@/lib/queries/project.queries";
import { ProjectsClient } from "@/components/projects/projects-client";

export default async function ProjectsPage() {
  const projects = await getProjectsList();

  return <ProjectsClient initialProjects={projects} />;
}
