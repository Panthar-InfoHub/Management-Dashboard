import { getProjectById } from "@/lib/queries/project.queries";
import { getEmployees } from "@/lib/queries/employee.queries";
import { getCurrentEmployee } from "@/lib/auth";
import { getTeams } from "@/lib/queries/team.queries";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectById(id);
  const allEmployees = await getEmployees();
  const allTeams = await getTeams();
  const employee = await getCurrentEmployee();
  const canEdit = employee.role === "ADMIN" || employee.role === "MANAGER" || project?.leadId === employee.id;

  if (!project) {
    notFound();
  }

  return <ProjectDetailClient 
    project={project} 
    allEmployees={allEmployees}
    allTeams={allTeams}
    canEdit={canEdit}
  />;
}
