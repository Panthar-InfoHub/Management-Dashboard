import { getTeamById } from "@/lib/queries/team.queries";
import { getEmployees } from "@/lib/queries/employee.queries";
import { getCurrentEmployee } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { TeamDetailClient } from "@/components/teams/team-detail-client";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeamById(id);
  const allEmployees = await getEmployees();
  const employee = await getCurrentEmployee();
  const canEdit = employee.role === "ADMIN" || employee.role === "MANAGER" || team?.leadId === employee.id;
  
  // Fetch tasks belonging to projects of this team
  const tasks = await db.task.findMany({
    where: { project: { teamId: id } },
    include: {
      assignees: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      project: { select: { name: true, id: true } }
    },
    orderBy: { updatedAt: "desc" },
    take: 20
  });

  if (!team) {
    notFound();
  }

  return <TeamDetailClient 
    team={JSON.parse(JSON.stringify(team))} 
    allEmployees={JSON.parse(JSON.stringify(allEmployees))} 
    tasks={JSON.parse(JSON.stringify(tasks))}
    canEdit={canEdit}
  />;
}
