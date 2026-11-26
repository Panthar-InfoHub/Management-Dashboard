// ── Permission resolution ──
// A person has a permission when any of these says yes:
//   1. Their role is ADMIN or SUPER_ADMIN (all permissions).
//   2. One of their access presets lists it (e.g. "HR").
//   3. A personal grant gives it: company-wide, or for one project; not expired.
//   4. For one project: they lead the project or the team that owns it, and the
//      permission is a lead power (tasks + editing that project).
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { CACHE_TAGS, accessTagFor } from "@/lib/cache/tags";
import { isAdminRole } from "@/lib/access";
import { ALL_PERMISSIONS, isPermission, type Permission } from "./permission-list";

export { type Permission, ALL_PERMISSIONS } from "./permission-list";

type Actor = { id: string; role: string };

/** Powers a project lead (or the lead of the project's team) has on that project. */
const LEAD_PERMISSIONS = new Set<Permission>(["task:create", "task:update", "task:delete", "task:assign", "project:update"]);

/** Presets + personal grants for one person. Cached across requests; access changes call updateTag. */
async function loadAccess(employeeId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.access, accessTagFor(employeeId));
  cacheLife("hours");

  const [presets, grants] = await Promise.all([
    db.employeeAccessPreset.findMany({
      where: { employeeId },
      select: { preset: { select: { permissions: true } } },
    }),
    db.employeePermission.findMany({
      where: { employeeId },
      select: { permission: true, projectId: true, expiresAt: true },
    }),
  ]);

  return {
    presetPermissions: [...new Set(presets.flatMap((p) => p.preset.permissions))],
    grants: grants.map((g) => ({ permission: g.permission, projectId: g.projectId, expiresAt: g.expiresAt?.toISOString() ?? null })),
  };
}

const getAccess = cache(loadAccess);

const getProjectLeads = cache(async (projectId: string) =>
  db.project.findUnique({
    where: { id: projectId },
    select: { leadId: true, team: { select: { leadId: true } } },
  })
);

function activeGrants(access: Awaited<ReturnType<typeof loadAccess>>) {
  const now = Date.now();
  return access.grants.filter((g) => !g.expiresAt || Date.parse(g.expiresAt) > now);
}

export async function hasPermission(actor: Actor, permission: Permission, projectId?: string): Promise<boolean> {
  if (isAdminRole(actor.role)) return true;

  const access = await getAccess(actor.id);
  if (access.presetPermissions.includes(permission)) return true;

  const grants = activeGrants(access).filter((g) => g.permission === permission);
  if (grants.some((g) => g.projectId === null)) return true;
  if (projectId && grants.some((g) => g.projectId === projectId)) return true;

  if (projectId && LEAD_PERMISSIONS.has(permission)) {
    const leads = await getProjectLeads(projectId);
    if (leads && (leads.leadId === actor.id || leads.team?.leadId === actor.id)) return true;
  }

  return false;
}

/** Company-wide permissions (presets + global grants). Used to show or hide UI. */
export async function getEffectivePermissions(actor: Actor): Promise<Permission[]> {
  if (isAdminRole(actor.role)) return ALL_PERMISSIONS;
  const access = await getAccess(actor.id);
  const global = activeGrants(access).filter((g) => g.projectId === null).map((g) => g.permission);
  return [...new Set([...access.presetPermissions, ...global])].filter(isPermission);
}
