"use client";

import { useAccessContext } from "@/components/providers/access-provider";
import { isAdminRole } from "@/lib/access";
import type { Permission } from "@/lib/permission-list";

/**
 * The signed-in person's role and company-wide permissions, read from the
 * database by AccessProvider. For showing or hiding UI only — every server
 * action checks access itself. Before it loads, everything optional is hidden.
 */
export function useAccess() {
  const access = useAccessContext();
  const isAdmin = isAdminRole(access?.role);
  const permissions = new Set<string>(access?.permissions ?? []);
  return {
    isLoaded: access !== null,
    role: access?.role ?? null,
    isAdmin,
    can: (permission: Permission) => isAdmin || permissions.has(permission),
  };
}
