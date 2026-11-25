// Who may be assigned work on a project: its members, its lead, and the
// members and lead of the team that owns it. Deactivated employees are excluded.
// Internal helper for Server Actions and pages; it does no auth checks itself.
import { cache } from "react";
import { db } from "@/lib/db";

const assignableSelect = { id: true, firstName: true, lastName: true, avatarUrl: true } as const;
export type AssignableEmployee = { id: string; firstName: string; lastName: string; avatarUrl: string | null };

export const getAssignableEmployees = cache(async (projectId: string): Promise<AssignableEmployee[]> => {
  const active = { status: { not: "INACTIVE" as const } };
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      lead: { select: { ...assignableSelect, status: true } },
      members: { where: { employee: active }, select: { employee: { select: assignableSelect } } },
      team: {
        select: {
          lead: { select: { ...assignableSelect, status: true } },
          members: { where: active, select: assignableSelect },
        },
      },
    },
  });
  if (!project) return [];

  const byId = new Map<string, AssignableEmployee>();
  const add = (e: (AssignableEmployee & { status?: string }) | null | undefined) => {
    if (!e || e.status === "INACTIVE") return;
    byId.set(e.id, { id: e.id, firstName: e.firstName, lastName: e.lastName, avatarUrl: e.avatarUrl });
  };
  add(project.lead);
  project.members.forEach((m) => add(m.employee));
  add(project.team?.lead);
  project.team?.members.forEach(add);

  return [...byId.values()].sort((a, b) => a.firstName.localeCompare(b.firstName));
});

/**
 * Throw unless every id in `assigneeIds` can be assigned on the project.
 * Ids in `alreadyAssigned` are allowed through, so editing a task never fails
 * because someone assigned earlier has since left the project.
 */
export async function assertAssignable(projectId: string, assigneeIds: string[], alreadyAssigned: string[] = []) {
  const newIds = assigneeIds.filter((id) => !alreadyAssigned.includes(id));
  if (newIds.length === 0) return;

  const allowed = new Set((await getAssignableEmployees(projectId)).map((e) => e.id));
  const rejected = newIds.filter((id) => !allowed.has(id));
  if (rejected.length > 0) {
    const people = await db.employee.findMany({ where: { id: { in: rejected } }, select: { firstName: true, lastName: true } });
    const names = people.map((p) => `${p.firstName} ${p.lastName}`).join(", ") || "Some people";
    throw new Error(`${names} can't be assigned. Only members of this project or its team can be assigned. Add them to the project first.`);
  }
}

/** For task forms: each project's assignable employee ids, in one query. */
export async function getAssignableIdsByProject(projectIds: string[]): Promise<Record<string, string[]>> {
  if (projectIds.length === 0) return {};
  const active = { status: { not: "INACTIVE" as const } };
  const projects = await db.project.findMany({
    where: { id: { in: projectIds } },
    select: {
      id: true,
      leadId: true,
      members: { where: { employee: active }, select: { employeeId: true } },
      team: { select: { leadId: true, members: { where: active, select: { id: true } } } },
    },
  });
  return Object.fromEntries(
    projects.map((p) => [
      p.id,
      [...new Set([
        p.leadId,
        ...p.members.map((m) => m.employeeId),
        ...(p.team ? [p.team.leadId, ...p.team.members.map((m) => m.id)] : []),
      ])],
    ])
  );
}
