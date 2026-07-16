// ── Audit Logger ──
// Centralized audit trail for all entity mutations.
// Every Server Action that changes data should call logAudit().

import { db } from "@/lib/db";
import type { AuditAction } from "@prisma/client";

interface AuditEntry {
  action: AuditAction;
  entity: string;      // "Task", "Project", "Leave", "Employee", etc.
  entityId: string;
  description: string;
  actorId: string;      // Employee.id (not clerkId)
  metadata?: Record<string, unknown>;
}

/**
 * Write an entry to the AuditLog table.
 * Fire-and-forget — we don't await in the critical path.
 */
export function logAudit(entry: AuditEntry): void {
  db.auditLog
    .create({
      data: {
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        description: entry.description,
        actorId: entry.actorId,
        metadata: (entry.metadata as any) ?? undefined,
      },
    })
    .catch((err) => {
      console.error("[AuditLog] Failed to write audit entry:", err);
    });
}
