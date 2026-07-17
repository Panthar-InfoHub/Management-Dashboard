import { Suspense } from "react";
import { getProjectsList } from "@/lib/queries/project.queries";
import { ProjectsClient } from "@/components/projects/projects-client";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import ProjectsLoading from "./loading";

async function ProjectsData({ canCreate }: { canCreate: boolean }) {
  const projects = await getProjectsList();
  return <ProjectsClient initialProjects={projects} canCreate={canCreate} />;
}

export default async function ProjectsPage() {
  // Fetch only what's needed for the shell (auth is cached)
  await getCurrentEmployee();
  const canCreate = await checkPermission("project:create");

  // Instantly render the page shell and stream the data
  return (
    <Suspense fallback={<ProjectsLoading />}>
      <ProjectsData canCreate={canCreate} />
    </Suspense>
  );
}
