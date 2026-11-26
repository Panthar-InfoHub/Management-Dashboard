import { getTeamById, getTeamRecentTasks } from "@/lib/queries/team.queries";
import { getEmployees } from "@/lib/queries/employee.queries";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { TeamDetailClient } from "@/components/teams/team-detail-client";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Read the signed-in user first: that makes this a request-time render, so the clock below is allowed.
  const employee = await getCurrentEmployee();
  const now = new Date();
  const open = { notIn: ["DONE", "CANCELLED"] as ("DONE" | "CANCELLED")[] };
  const [team, allEmployees, canUpdateGlobal, canDelete, tasks, openCount, overdueCount, doneWeek] = await Promise.all([
    getTeamById(id),
    getEmployees(),
    checkPermission("team:update"),
    checkPermission("team:delete"),
    getTeamRecentTasks(id),
    db.task.count({ where: { project: { teamId: id }, status: open } }),
    db.task.count({ where: { project: { teamId: id }, status: open, dueDate: { lt: now } } }),
    db.task.count({ where: { project: { teamId: id }, status: "DONE", completedAt: { gte: new Date(now.getTime() - 7 * 86400000) } } }),
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
    stats={{ open: openCount, overdue: overdueCount, doneWeek }}
  />;
}
