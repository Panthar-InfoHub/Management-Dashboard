import { Suspense } from "react";
import { getProjectsList } from "@/lib/queries/project.queries";
import { ProjectsClient } from "@/components/projects/projects-client";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProjectsBodySkeleton } from "./skeleton";

export default function ProjectsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
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
