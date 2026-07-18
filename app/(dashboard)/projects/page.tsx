import { Suspense } from "react";
import { getProjectsList } from "@/lib/queries/project.queries";
import { ProjectsClient } from "@/components/projects/projects-client";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import ProjectsLoading from "./skeleton";

async function ProjectsData({ canCreate }: { canCreate: boolean }) {
  const projects = await getProjectsList();
  return <ProjectsClient initialProjects={projects} canCreate={canCreate} />;
}

export default function ProjectsPage() {
  // Instantly render the page shell and stream the data
  return (
    <div className="flex flex-col gap-6 p-6 h-[calc(100vh-64px)] min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage and track all active projects across your organization.</p>
        </div>
      </div>
      <Suspense fallback={<ProjectsLoading />}>
        <ProjectsDataAsync />
      </Suspense>
    </div>
  );
}

async function ProjectsDataAsync() {
  const [canCreate, projects] = await Promise.all([
    checkPermission("project:create"),
    getProjectsList()
  ]);
  return <ProjectsClient initialProjects={projects} canCreate={canCreate} />;
}
