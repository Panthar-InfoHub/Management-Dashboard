// Audit log reads (Admins and Super Admins).
import { db } from "@/lib/db";

export const AUDIT_PAGE_SIZE = 50;

export type AuditFilters = { entity?: string; actor?: string; action?: string; from?: string; to?: string; before?: string };

/** Where an entry's item lives in the app, when it has a page. */
export function auditHref(entity: string, entityId: string): string | null {
  switch (entity) {
    case "Task": return `/tasks/${entityId}`;
    case "Project": return `/projects/${entityId}`;
    case "Team": return `/teams/${entityId}`;
    case "Employee":
    case "EmployeePermission": return `/employees/${entityId}`;
    default: return null;
  }
}

export async function getAuditPage(filters: AuditFilters) {
  const valid = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);
  const from = valid(filters.from), to = valid(filters.to);
  const before = filters.before && !isNaN(Date.parse(filters.before)) ? new Date(filters.before) : undefined;

  const where = {
    ...(filters.entity ? { entity: filters.entity } : {}),
    ...(filters.actor ? { actorId: filters.actor } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    createdAt: {
      ...(from ? { gte: new Date(`${from}T00:00:00+05:30`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999+05:30`) } : {}),
      ...(before ? { lt: before } : {}),
    },
  };

  const [rows, entities, actions, actors] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: AUDIT_PAGE_SIZE + 1,
      select: {
        id: true, entity: true, entityId: true, action: true, changes: true, createdAt: true,
        actor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    }),
    db.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
    db.employee.findMany({ where: { auditLogs: { some: {} } }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" } }),
  ]);

  const hasMore = rows.length > AUDIT_PAGE_SIZE;
  const page = rows.slice(0, AUDIT_PAGE_SIZE);
  return {
    rows: page.map((r) => ({
      id: r.id,
      at: r.createdAt.toISOString(),
      entity: r.entity,
      entityId: r.entityId,
      action: r.action,
      changes: r.changes,
      href: auditHref(r.entity, r.entityId),
      actor: r.actor ? { id: r.actor.id, name: `${r.actor.firstName} ${r.actor.lastName}`, avatarUrl: r.actor.avatarUrl } : null,
    })),
    nextBefore: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
    options: {
      entities: entities.map((e) => e.entity),
      actions: actions.map((a) => a.action),
      actors: actors.map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}` })),
    },
  };
}
