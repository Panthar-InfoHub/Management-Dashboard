// ── Centralized Permission System ──
// THE ONLY FILE WHERE PERMISSIONS ARE DEFINED.
// To add/change any permission: edit the PERMISSIONS object below. Done.
// No other file in the codebase should contain role-checking logic.

import { Role } from "@prisma/client";

// ─── Permission Definitions ───
// Key = action identifier, Value = array of roles allowed to perform it.

export const PERMISSIONS = {
  // ── Tasks ──
  "task:create":     [Role.ADMIN, Role.MANAGER],
  "task:assign":     [Role.ADMIN, Role.MANAGER],
  "task:update:own": [Role.ADMIN, Role.MANAGER, Role.EMPLOYEE],
  "task:update:any": [Role.ADMIN, Role.MANAGER],
  "task:delete":     [Role.ADMIN],
  "task:move:own":   [Role.ADMIN, Role.MANAGER, Role.EMPLOYEE],
  "task:move:any":   [Role.ADMIN, Role.MANAGER],

  // ── Projects ──
  "project:create":  [Role.ADMIN],
  "project:update":  [Role.ADMIN, Role.MANAGER],
  "project:delete":  [Role.ADMIN],
  "project:view":    [Role.ADMIN, Role.MANAGER, Role.EMPLOYEE],

  // ── Teams ──
  "team:create":          [Role.ADMIN],
  "team:update":          [Role.ADMIN],
  "team:manage-members":  [Role.ADMIN, Role.MANAGER],

  // ── Employees ──
  "employee:view:all":    [Role.ADMIN, Role.MANAGER],
  "employee:update:own":  [Role.ADMIN, Role.MANAGER, Role.EMPLOYEE],
  "employee:update:any":  [Role.ADMIN],
  "employee:role:change": [Role.ADMIN],

  // ── Daily Updates ──
  "update:submit":    [Role.ADMIN, Role.MANAGER, Role.EMPLOYEE],
  "update:view:team": [Role.ADMIN, Role.MANAGER],
  "update:view:all":  [Role.ADMIN],

  // ── Leave ──
  "leave:request":      [Role.ADMIN, Role.MANAGER, Role.EMPLOYEE],
  "leave:approve":      [Role.ADMIN, Role.MANAGER],
  "leave:view:team":    [Role.ADMIN, Role.MANAGER],
  "leave:view:all":     [Role.ADMIN],
  "leave:balance:edit": [Role.ADMIN],

  // ── Attendance ──
  "attendance:view:own":  [Role.ADMIN, Role.MANAGER, Role.EMPLOYEE],
  "attendance:view:team": [Role.ADMIN, Role.MANAGER],
  "attendance:view:all":  [Role.ADMIN],
  "attendance:edit":      [Role.ADMIN],

  // ── Reports & Analytics ──
  "reports:view":   [Role.ADMIN, Role.MANAGER],
  "reports:export": [Role.ADMIN],

  // ── Settings & Admin ──
  "settings:view": [Role.ADMIN],
  "audit:view":    [Role.ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ─── Core Check Functions ───

/** Check if a role has a specific permission. */
export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission]?.includes(role as any) ?? false;
}

/** Throw if the role lacks the permission. Use in Server Actions / API routes. */
export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: requires "${permission}"`);
  }
}

/** Return every permission a given role has. Useful for sending to the client. */
export function getPermissionsForRole(role: Role): Permission[] {
  return (Object.entries(PERMISSIONS) as [Permission, readonly Role[]][])
    .filter(([, roles]) => roles.includes(role))
    .map(([perm]) => perm);
}
