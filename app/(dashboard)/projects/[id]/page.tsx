import { getProjectById } from "@/lib/queries/project.queries";
import { getEmployees } from "@/lib/queries/employee.queries";
import { getTeams } from "@/lib/queries/team.queries";
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectById(id);
  const allEmployees = await getEmployees();
  const allTeams = await getTeams();

  if (!project) {
    notFound();
  }

  return <ProjectDetailClient 
    project={project} 
    allEmployees={allEmployees}
    allTeams={allTeams}
  />;
}
