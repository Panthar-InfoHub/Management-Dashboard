"use server";
import { UserError } from "@/lib/errors";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/access";
import { audit } from "@/lib/audit";

/** Retention: Super Admins delete audit entries older than N months (default 12). */
export async function pruneAuditLogAction(months = 12) {
  const actor = await getCurrentEmployee();
  if (!isSuperAdmin(actor.role)) throw new UserError("Only Super Admins can delete audit history.");
  if (!Number.isInteger(months) || months < 6) throw new UserError("Keep at least 6 months of history.");
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const { count } = await db.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  audit({ actorId: actor.id, entity: "AuditLog", entityId: "prune", action: "prune", changes: { months, deleted: count, before: cutoff.toISOString() } });
  revalidatePath("/audit");
  return { deleted: count };
}
