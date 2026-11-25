import { after } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma";

export type AuditEntity =
  | "Task"
  | "Project"
  | "Team"
  | "Employee"
  | "SystemRole"
  | "AccessPreset"
  | "EmployeePermission"
  | "Comment";

/**
 * Record who changed what. Runs after the response is sent (`after()`), so a
 * slow or failing audit write never delays or breaks the user's action.
 * Internal helper: call only from Server Actions that already checked auth.
 */
export function audit(entry: {
  actorId: string | null;
  entity: AuditEntity;
  entityId: string;
  action: string;
  changes?: Prisma.InputJsonValue;
}) {
  after(async () => {
    try {
      await db.auditLog.create({ data: entry });
    } catch (error) {
      console.error("[audit] failed to write entry", entry.entity, entry.entityId, error);
    }
  });
}

/** Field-level diff for the audit `changes` column: { field: [before, after] }. */
export function diffFields<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const changes: Record<string, [unknown, unknown]> = {};
  for (const key of Object.keys(after) as (keyof T)[]) {
    const prev = before[key] instanceof Date ? (before[key] as Date).toISOString() : before[key];
    const next = after[key] instanceof Date ? (after[key] as Date).toISOString() : after[key];
    if (next !== undefined && JSON.stringify(prev) !== JSON.stringify(next)) {
      changes[key as string] = [prev ?? null, next ?? null];
    }
  }
  return changes as Prisma.InputJsonValue;
}
