// What has to be handled before someone leaves. Shown in the Offboard dialog.
import { db } from "@/lib/db";
import { tracksAttendance } from "@/lib/access";
import { todayKey, fromDateKey } from "@/lib/attendance/calendar";
import { getBalances } from "@/lib/leave/queries";

export async function getOffboardingChecklist(employeeId: string, role: string) {
  const today = todayKey("Asia/Kolkata");
  const [ledProjects, ledTeams, openTasks, openTaskCount, requests] = await Promise.all([
    db.project.findMany({ where: { leadId: employeeId, status: { not: "ARCHIVED" } }, select: { id: true, name: true } }),
    db.team.findMany({ where: { leadId: employeeId }, select: { id: true, name: true } }),
    db.task.findMany({
      where: { status: { not: "DONE" }, assignees: { some: { id: employeeId } } },
      select: { id: true, title: true, project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    db.task.count({ where: { status: { not: "DONE" }, assignees: { some: { id: employeeId } } } }),
    db.request.count({
      where: { employeeId, OR: [{ status: "PENDING" }, { status: "APPROVED", startDate: { gt: fromDateKey(today) } }] },
    }),
  ]);
  const balances = tracksAttendance(role)
    ? (await getBalances(employeeId, Number(today.slice(0, 4)))).filter((b) => !b.unlimited && (b.available ?? 0) > 0)
    : [];

  return {
    ledProjects,
    ledTeams,
    openTasks: openTasks.map((t) => ({ id: t.id, title: t.title, project: t.project.name })),
    openTaskCount,
    openRequests: requests,
    balances: balances.map((b) => ({ name: b.name, available: b.available ?? 0 })),
  };
}

export type OffboardingChecklist = Awaited<ReturnType<typeof getOffboardingChecklist>>;
