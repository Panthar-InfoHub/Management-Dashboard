import { UserError } from "@/lib/errors";
// Who may be assigned work on a project: its members, its lead, and the
// members and lead of the team that owns it. Deactivated employees are excluded.
// Internal helper for Server Actions and pages; it does no auth checks itself.
import { cache } from "react";
import { db } from "@/lib/db";
import { checkPermission, getCurrentEmployee } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

const assignableSelect = { id: true, firstName: true, lastName: true, avatarUrl: true } as const;
export type AssignableEmployee = { id: string; firstName: string; lastName: string; avatarUrl: string | null };

/**
 * General tasks (no project): with task:assign anyone active can be assigned;
 * otherwise yourself and the people in teams you lead.
 */
export const getGeneralAssignable = cache(async (): Promise<AssignableEmployee[]> => {
  const me = await getCurrentEmployee();
  const active = { status: { not: "INACTIVE" as const } };
  const everyone = await hasPermission(me, "task:assign");
  const people = await db.employee.findMany({
    where: everyone
      ? active
      : { ...active, OR: [{ id: me.id }, { teamMemberships: { some: { team: { leadId: me.id } } } }] },
    select: assignableSelect,
    orderBy: { firstName: "asc" },
  });
  return people;
});

export const getAssignableEmployees = cache(async (projectId: string | null): Promise<AssignableEmployee[]> => {
  if (!projectId) return getGeneralAssignable();
  const active = { status: { not: "INACTIVE" as const } };
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      lead: { select: { ...assignableSelect, status: true } },
      members: { where: { employee: active }, select: { employee: { select: assignableSelect } } },
      team: {
        select: {
          lead: { select: { ...assignableSelect, status: true } },
          memberships: { where: { employee: active }, select: { employee: { select: assignableSelect } } },
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
  project.team?.memberships.forEach((m) => add(m.employee));

  return [...byId.values()].sort((a, b) => a.firstName.localeCompare(b.firstName));
});

/**
 * May the signed-in person assign people from outside the project (or, for
 * General tasks, outside their own teams)? Admins, project and team leads,
 * and anyone given task:assign or task:update there.
 */
export const canAssignOutside = cache(async (projectId: string | null): Promise<boolean> => {
  const scope = projectId ?? undefined;
  return (await checkPermission("task:assign", scope)) || (await checkPermission("task:update", scope));
});

/** Every active person: the choice list once "outside the project" is on. */
export const getAllAssignable = cache(async (): Promise<AssignableEmployee[]> =>
  db.employee.findMany({ where: { status: { not: "INACTIVE" } }, select: assignableSelect, orderBy: { firstName: "asc" } })
);

/**
 * Throw unless every id in `assigneeIds` can be assigned on the project.
 * With `outside`, anyone active can be assigned, if the caller may do that.
 * Ids in `alreadyAssigned` are allowed through, so editing a task never fails
 * because someone assigned earlier has since left the project.
 */
export async function assertAssignable(projectId: string | null, assigneeIds: string[], alreadyAssigned: string[] = [], opts: { outside?: boolean } = {}) {
  const newIds = assigneeIds.filter((id) => !alreadyAssigned.includes(id));
  if (newIds.length === 0) return;

  if (opts.outside && !(await canAssignOutside(projectId))) {
    throw new UserError("You can't assign people from outside this project. Ask its lead or an admin.");
  }
  const pool = opts.outside ? await getAllAssignable() : await getAssignableEmployees(projectId);
  const allowed = new Set(pool.map((e) => e.id));
  const rejected = newIds.filter((id) => !allowed.has(id));
  if (rejected.length > 0) {
    const people = await db.employee.findMany({ where: { id: { in: rejected } }, select: { firstName: true, lastName: true } });
    const names = people.map((p) => `${p.firstName} ${p.lastName}`).join(", ") || "Some people";
    throw new UserError(projectId
      ? `${names} can't be assigned. Only members of this project or its team can be assigned. Add them to the project first.`
      : `${names} can't be assigned to a General task by you. You can assign yourself and people in teams you lead.`);
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
      team: { select: { leadId: true, memberships: { where: { employee: active }, select: { employeeId: true } } } },
    },
  });
  return Object.fromEntries(
    projects.map((p) => [
      p.id,
      [...new Set([
        p.leadId,
        ...p.members.map((m) => m.employeeId),
        ...(p.team ? [p.team.leadId, ...p.team.memberships.map((m) => m.employeeId)] : []),
      ])],
    ])
  );
}

/** For forms: per project id (plus "GENERAL"), may the viewer assign people from outside it? */
export async function getOutsideAllowed(projectIds: string[]): Promise<Record<string, boolean>> {
  const ids = [...projectIds, null];
  // Company-wide rights (admins, presets, global grants) answer for every project in one check.
  if (await canAssignOutside(null)) return Object.fromEntries(ids.map((id) => [id ?? "GENERAL", true]));
  const flags = await Promise.all(ids.map((id) => canAssignOutside(id)));
  return Object.fromEntries(ids.map((id, i) => [id ?? "GENERAL", flags[i]]));
}
