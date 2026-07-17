// ── Centralized Dynamic Permission System ──
import { db } from "@/lib/db";
export { type Permission, ALL_PERMISSIONS } from "./permission-list";
import { type Permission as LocalPermission } from "./permission-list";

// ─── Core Check Functions ───

/** Check if a role has a specific permission. */
export async function hasPermission(roleName: string, permission: LocalPermission): Promise<boolean> {
  if (roleName === "ADMIN") return true;
  
  const roleRecord = await db.systemRole.findUnique({
    where: { name: roleName }
  });
  if (!roleRecord) return false;
  return roleRecord.permissions.includes(permission as string);
}

/** Throw if the role lacks the permission. Use in Server Actions / API routes. */
export async function requirePermission(roleName: string, permission: LocalPermission): Promise<void> {
  const has = await hasPermission(roleName, permission);
  if (!has) {
    throw new Error(`Forbidden: requires "${permission}"`);
  }
}

/** Get all permissions for a given role */
export async function getPermissionsForRole(roleName: string): Promise<string[]> {
  const roleRecord = await db.systemRole.findUnique({
    where: { name: roleName }
  });
  return roleRecord?.permissions || [];
}
