import { Suspense } from "react";
import { getProjectsList } from "@/lib/queries/project.queries";
import { ProjectsClient } from "@/components/projects/projects-client";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProjectsBodySkeleton } from "./skeleton";

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
      <Suspense fallback={<ProjectsBodySkeleton />}>
        <ProjectsDataAsync />
      </Suspense>
    </div>
  );
}

async function ProjectsDataAsync() {
  const [canCreate, canEditAll, me, projects] = await Promise.all([
    checkPermission("project:create"),
    checkPermission("project:update"),
    getCurrentEmployee(),
    getProjectsList()
  ]);
  // Admins and anyone granted project:update edit every project; leads edit
  // the projects they or their team lead.
  const editableIds = canEditAll
    ? projects.map((p) => p.id)
    : (await db.project.findMany({
        where: { OR: [{ leadId: me.id }, { team: { leadId: me.id } }, { delegatedPerms: { some: { employeeId: me.id, permission: "project:update" } } }] },
        select: { id: true },
      })).map((p) => p.id);
  return <ProjectsClient initialProjects={projects} canCreate={canCreate} editableIds={editableIds} />;
}
