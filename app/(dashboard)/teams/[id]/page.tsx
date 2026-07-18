import { getTeamById } from "@/lib/queries/team.queries";
import { getEmployees } from "@/lib/queries/employee.queries";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { TeamDetailClient } from "@/components/teams/team-detail-client";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [team, allEmployees, employee, canUpdateGlobal, canDelete, tasks] = await Promise.all([
    getTeamById(id),
    getEmployees(),
    getCurrentEmployee(),
    checkPermission("team:update"),
    checkPermission("team:delete"),
    db.task.findMany({
      where: { project: { teamId: id } },
      include: {
        assignees: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        project: { select: { name: true, id: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 20
    })
  ]);
  const canEdit = canUpdateGlobal || team?.leadId === employee.id;

  if (!team) {
    notFound();
  }

  return <TeamDetailClient 
    team={JSON.parse(JSON.stringify(team))} 
    allEmployees={JSON.parse(JSON.stringify(allEmployees))} 
    tasks={JSON.parse(JSON.stringify(tasks))}
    canEdit={canEdit}
    canDelete={canDelete}
  />;
}
