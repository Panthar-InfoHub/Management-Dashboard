"use client";

// ── Permission Gate Component ──
// Declarative way to show/hide UI based on permissions.
// Usage:
//   <PermissionGate permission="leave:approve">
//     <ApproveButton />
//   </PermissionGate>

import type { ReactNode } from "react";
import { usePermission, useAnyPermission } from "@/hooks/use-permission";
import type { Permission } from "@/lib/permissions";

interface PermissionGateProps {
  /** Single permission to check */
  permission?: Permission;
  /** Multiple permissions — user must have ANY of them */
  anyOf?: Permission[];
  /** What to show if the user lacks the permission */
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ permission, anyOf, fallback = null, children }: PermissionGateProps) {
  const hasSingle = permission ? usePermission(permission) : true;
  const hasAny = anyOf ? useAnyPermission(...anyOf) : true;

  if (!hasSingle || !hasAny) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
