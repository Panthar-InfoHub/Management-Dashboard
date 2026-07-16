"use client";

// ── Permission Provider ──
// Wraps children with PermissionContext.
// Receives the serialized permission list from a Server Component
// and exposes it via usePermission() hook.

import { type ReactNode } from "react";
import { PermissionContext } from "@/hooks/use-permission";
import type { Permission } from "@/lib/permissions";

interface PermissionProviderProps {
  permissions: Permission[];
  children: ReactNode;
}

export function PermissionProvider({ permissions, children }: PermissionProviderProps) {
  const permSet = new Set(permissions);
  return (
    <PermissionContext value={permSet}>
      {children}
    </PermissionContext>
  );
}
