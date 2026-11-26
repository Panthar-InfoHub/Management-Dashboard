import { getProjectById } from "@/lib/queries/project.queries";
import { getEmployees } from "@/lib/queries/employee.queries";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { getTeams } from "@/lib/queries/team.queries";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";

export default async function ProjectDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [project, allEmployees, allTeams, employee, canUpdateGlobal, canDelete] = await Promise.all([
    getProjectById(id),
    getEmployees(),
    getTeams(),
    getCurrentEmployee(),
    checkPermission("project:update", id),
    checkPermission("project:delete"),
  ]);
  // project:update for this project covers admins, the project lead, the
  // owning team's lead and anyone granted it; they also hand out project powers.
  const canEdit = canUpdateGlobal || project?.leadId === employee.id;
  const canDelegate = canEdit;

  if (!project) {
    notFound();
  }

  return <ProjectDetailClient 
    project={project} 
    allEmployees={allEmployees}
    allTeams={allTeams}
    canEdit={canEdit}
    canDelete={canDelete}
    canDelegate={canDelegate}
    openEdit={query.edit === "1"}
  />;
}
