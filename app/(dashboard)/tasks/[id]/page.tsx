import { notFound } from "next/navigation";
import { canViewTask, getSubtasks, loadTaskDetail } from "@/lib/queries/task.queries";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { UserError } from "@/lib/errors";
import { canAssignOutside, getAllAssignable, getAssignableEmployees } from "@/lib/tasks/assignees";
import { TaskDetailClient } from "@/components/tasks/task-detail-client";
import { db } from "@/lib/db";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Round trip 1: who is asking, and the task itself, side by side.
  const [employee, canViewAll, task] = await Promise.all([
    getCurrentEmployee(),
    checkPermission("task:update"),
    loadTaskDetail(id),
  ]);
  if (!task) notFound();
  if (!canViewTask(task, employee.id, canViewAll)) throw new UserError("You don't have access to this task.");

  const projectId = task.projectId;
  // Round trip 2: rights on this project and everything the page lists, all at once.
  const [canUpdate, canDelete, outsideOk, canManageProject, projectTasks, subtaskTree, assignable, everyone] = await Promise.all([
    checkPermission("task:update", projectId ?? undefined),
    checkPermission("task:delete", projectId ?? undefined),
    canAssignOutside(projectId),
    projectId ? checkPermission("project:update", projectId) : Promise.resolve(false),
    // Candidates for "Blocked by": tasks in the same project (General: only your own).
    db.task.findMany({
      where: projectId
        ? { projectId, id: { not: task.id }, status: { notIn: ["DONE", "CANCELLED"] } }
        : { projectId: null, id: { not: task.id }, status: { notIn: ["DONE", "CANCELLED"] }, OR: [{ creatorId: employee.id }, { assignees: { some: { id: employee.id } } }] },
      select: { id: true, title: true, status: true, number: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    getSubtasks(task.id),
    getAssignableEmployees(projectId),
    getAllAssignable(),
  ]);

  // Managers (project and team leads, admins) get edit, delete and cancel here too.
  const isCreator = task.creatorId === employee.id;
  const canEditDetails = canUpdate || isCreator;
  // People assigned from outside the project can't open the project page, so don't link them there.
  const canOpenProject = !!task.project && (canManageProject || task.project.leadId === employee.id || task.project.members.some((m) => m.employeeId === employee.id));
  const isInvolved = isCreator || task.assignees.some((a) => a.id === employee.id) || (task.project?.members.some((m) => m.employeeId === employee.id) ?? false);

  return (
    <TaskDetailClient
      initialTask={task}
      projectTasks={projectTasks}
      subtaskTree={subtaskTree}
      assignableEmployees={assignable}
      outsideEmployees={outsideOk ? everyone : []}
      viewer={{ id: employee.id, firstName: employee.firstName, lastName: employee.lastName, avatarUrl: employee.avatarUrl }}
      canEditDetails={canEditDetails}
      canEditStatus={canEditDetails || isInvolved}
      canDelete={canDelete || (!projectId && isCreator)}
      canCancel={canUpdate || isCreator || task.ownerId === employee.id}
      canOpenProject={canOpenProject}
    />
  );
}
