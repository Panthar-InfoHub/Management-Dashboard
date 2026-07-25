// ── Centralized Dynamic Permission System ──
import { db } from "@/lib/db";
export { type Permission, ALL_PERMISSIONS } from "./permission-list";
import { type Permission as LocalPermission } from "./permission-list";
import { cache } from "react";

// ─── Internal: request-scoped cache for role records ───

/** Fetch a SystemRole record, cached per-request so multiple
 *  `hasPermission()` calls for the same role hit the DB only once. */
const getRoleCached = cache(async (roleName: string) => {
  return db.systemRole.findUnique({
    where: { name: roleName },
  });
});

/** Fetch per-user permission overrides, cached per-request. */
const getUserPermissionsCached = cache(async (employeeId: string) => {
  const now = new Date();
  const perms = await db.employeePermission.findMany({
    where: {
      employeeId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    select: { permission: true, projectId: true },
  });
  return perms;
});

// ─── Core Check Functions ───

/** Check if a role has a specific permission.
 *  Resolution order: ADMIN bypass → role permissions → global user override → project-scoped user override.
 *  The employeeId is optional; when provided, user-level grants are also checked. */
export async function hasPermission(
  roleName: string,
  permission: LocalPermission,
  employeeId?: string,
  projectId?: string,
): Promise<boolean> {
  // ADMINs always have every permission — no DB lookup needed.
  if (roleName === "ADMIN") return true;

  const roleRecord = await getRoleCached(roleName);
  if (roleRecord?.permissions.includes(permission as string)) return true;

  // Check per-user overrides (if employeeId available)
  if (employeeId) {
    const userPerms = await getUserPermissionsCached(employeeId);
    
    // Check for a global override first (projectId is null)
    const hasGlobalOverride = userPerms.some((p) => p.permission === permission && p.projectId === null);
    if (hasGlobalOverride) return true;

    // Check for a project-scoped override if a projectId context was provided
    if (projectId) {
      const hasProjectOverride = userPerms.some((p) => p.permission === permission && p.projectId === projectId);
      if (hasProjectOverride) return true;
    }
  }

  return false;
}

/** Throw if the role lacks the permission. Use in Server Actions / API routes. */
export async function requirePermission(
  roleName: string,
  permission: LocalPermission,
  employeeId?: string,
): Promise<void> {
  const has = await hasPermission(roleName, permission, employeeId);
  if (!has) {
    throw new Error(`Forbidden: requires "${permission}"`);
  }
}

/** Get all permissions for a given role */
export async function getPermissionsForRole(roleName: string): Promise<string[]> {
  const roleRecord = await getRoleCached(roleName);
  return roleRecord?.permissions || [];
}
