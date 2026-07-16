"use client";

// ── Client-Side Permission Hook ──
// Uses the PermissionContext (set by PermissionProvider in the layout)
// to check permissions without server round-trips.

import { createContext, useContext } from "react";
import type { Permission } from "@/lib/permissions";

// Context holds the current user's granted permissions as a Set for O(1) lookup
export const PermissionContext = createContext<Set<Permission>>(new Set());

/**
 * Check if the current user has a specific permission.
 * Usage: const canApprove = usePermission("leave:approve");
 */
export function usePermission(permission: Permission): boolean {
  const permissions = useContext(PermissionContext);
  return permissions.has(permission);
}

/**
 * Check multiple permissions at once.
 * Returns true if the user has ALL of the specified permissions.
 */
export function usePermissions(...perms: Permission[]): boolean {
  const permissions = useContext(PermissionContext);
  return perms.every((p) => permissions.has(p));
}

/**
 * Check if the user has ANY of the specified permissions.
 */
export function useAnyPermission(...perms: Permission[]): boolean {
  const permissions = useContext(PermissionContext);
  return perms.some((p) => permissions.has(p));
}
