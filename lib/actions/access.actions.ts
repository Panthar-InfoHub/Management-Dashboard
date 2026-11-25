"use server";

// Who can do what beyond their role: access presets (named permission lists,
// e.g. "HR") and personal grants. Only Admins and Super Admins manage access.
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { canActOnEmployee, canManageAccess, isAdminRole } from "@/lib/access";
import { isPermission, PROJECT_SCOPED_PERMISSIONS, type Permission } from "@/lib/permission-list";
import { CACHE_TAGS, accessTagFor } from "@/lib/cache/tags";
import { audit } from "@/lib/audit";

async function requireAccessManager() {
  const actor = await getCurrentEmployee();
  if (!canManageAccess(actor.role)) throw new Error("Only Admins and Super Admins can change access.");
  return actor;
}

function cleanPermissions(input: string[]): Permission[] {
  const invalid = input.filter((p) => !isPermission(p));
  if (invalid.length > 0) throw new Error(`Unknown permission: ${invalid.join(", ")}`);
  return [...new Set(input)] as Permission[];
}

function cleanPresetName(name: string) {
  const value = name?.trim() ?? "";
  if (!value) throw new Error("Preset name is required.");
  if (value.length > 60) throw new Error("Preset name is too long. Keep it under 60 characters.");
  return value;
}

async function assertCanChangeAccessOf(actorRole: string, actorId: string, employeeId: string) {
  const target = await db.employee.findUnique({ where: { id: employeeId }, select: { role: true } });
  if (!target) throw new Error("Employee not found.");
  if (employeeId === actorId) throw new Error("You can't change your own access. Ask another admin.");
  if (isAdminRole(target.role)) throw new Error("Admins and Super Admins already have every permission.");
  if (!canActOnEmployee(actorRole, target.role)) throw new Error("You can't change this person's access.");
}

// ─── Presets ───

export async function listAccessPresetsAction() {
  await requireAccessManager();
  return db.accessPreset.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true, permissions: true, _count: { select: { members: true } } },
  });
}

export async function createAccessPresetAction(data: { name: string; description?: string; permissions: string[] }) {
  const actor = await requireAccessManager();
  const name = cleanPresetName(data.name);
  const permissions = cleanPermissions(data.permissions);

  const exists = await db.accessPreset.findUnique({ where: { name }, select: { id: true } });
  if (exists) throw new Error(`A preset named “${name}” already exists.`);

  const preset = await db.accessPreset.create({
    data: { name, description: data.description?.trim() || null, permissions },
  });

  audit({ actorId: actor.id, entity: "AccessPreset", entityId: preset.id, action: "create", changes: { name, permissions } });
  updateTag(CACHE_TAGS.presets);
  revalidatePath("/settings");
  return preset;
}

export async function updateAccessPresetAction(presetId: string, data: { name?: string; description?: string | null; permissions?: string[] }) {
  const actor = await requireAccessManager();
  const existing = await db.accessPreset.findUnique({ where: { id: presetId }, include: { members: { select: { employeeId: true } } } });
  if (!existing) throw new Error("Preset not found.");

  const name = data.name !== undefined ? cleanPresetName(data.name) : existing.name;
  if (name !== existing.name && (await db.accessPreset.findUnique({ where: { name }, select: { id: true } }))) {
    throw new Error(`A preset named “${name}” already exists.`);
  }
  const permissions = data.permissions !== undefined ? cleanPermissions(data.permissions) : existing.permissions;

  const preset = await db.accessPreset.update({
    where: { id: presetId },
    data: { name, description: data.description === undefined ? existing.description : data.description?.trim() || null, permissions },
  });

  audit({ actorId: actor.id, entity: "AccessPreset", entityId: presetId, action: "update", changes: { name: [existing.name, name], permissions: [existing.permissions, permissions] } });
  // Everyone holding this preset gains or loses access right away.
  updateTag(CACHE_TAGS.access);
  updateTag(CACHE_TAGS.presets);
  revalidatePath("/settings");
  return preset;
}

export async function deleteAccessPresetAction(presetId: string) {
  const actor = await requireAccessManager();
  const existing = await db.accessPreset.findUnique({ where: { id: presetId }, include: { members: { select: { employeeId: true } } } });
  if (!existing) throw new Error("Preset not found.");

  await db.accessPreset.delete({ where: { id: presetId } });

  audit({ actorId: actor.id, entity: "AccessPreset", entityId: presetId, action: "delete", changes: { name: existing.name, holders: existing.members.length } });
  updateTag(CACHE_TAGS.access);
  updateTag(CACHE_TAGS.presets);
  revalidatePath("/settings");
  return { success: true };
}

// ─── One person's access ───

/** Presets and company-wide grants for one person. Admins, or the person themselves. */
export async function getEmployeeAccessAction(employeeId: string) {
  const actor = await getCurrentEmployee();
  if (!canManageAccess(actor.role) && actor.id !== employeeId) {
    throw new Error("You do not have permission to view this information.");
  }

  const [presets, grants] = await Promise.all([
    db.employeeAccessPreset.findMany({ where: { employeeId }, select: { presetId: true } }),
    db.employeePermission.findMany({
      where: { employeeId, projectId: null },
      select: { permission: true, expiresAt: true },
    }),
  ]);
  return { presetIds: presets.map((p) => p.presetId), permissions: grants.map((g) => ({ permission: g.permission, expiresAt: g.expiresAt })) };
}

export async function setEmployeePresetsAction(employeeId: string, presetIds: string[]) {
  const actor = await requireAccessManager();
  await assertCanChangeAccessOf(actor.role, actor.id, employeeId);

  const ids = [...new Set(presetIds)];
  const found = await db.accessPreset.count({ where: { id: { in: ids } } });
  if (found !== ids.length) throw new Error("One of the presets no longer exists. Reload and try again.");

  const before = await db.employeeAccessPreset.findMany({ where: { employeeId }, select: { presetId: true } });
  await db.$transaction([
    db.employeeAccessPreset.deleteMany({ where: { employeeId, presetId: { notIn: ids } } }),
    db.employeeAccessPreset.createMany({
      data: ids.map((presetId) => ({ employeeId, presetId, grantedBy: actor.id })),
      skipDuplicates: true,
    }),
  ]);

  audit({ actorId: actor.id, entity: "EmployeePermission", entityId: employeeId, action: "presets", changes: { presetIds: [before.map((b) => b.presetId), ids] } });
  updateTag(accessTagFor(employeeId));
  revalidatePath(`/employees/${employeeId}`);
  return { success: true };
}

/** Replace a person's company-wide personal permissions. Project-scoped grants are left alone. */
export async function setEmployeePermissionsAction(data: { employeeId: string; permissions: string[]; expiresAt?: string | null }) {
  const actor = await requireAccessManager();
  await assertCanChangeAccessOf(actor.role, actor.id, data.employeeId);
  const permissions = cleanPermissions(data.permissions);
  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  if (expiresAt && isNaN(expiresAt.getTime())) throw new Error("Invalid expiry date.");

  const before = await db.employeePermission.findMany({ where: { employeeId: data.employeeId, projectId: null }, select: { permission: true } });
  await db.$transaction([
    db.employeePermission.deleteMany({ where: { employeeId: data.employeeId, projectId: null } }),
    db.employeePermission.createMany({
      data: permissions.map((permission) => ({ employeeId: data.employeeId, permission, grantedBy: actor.id, expiresAt })),
    }),
  ]);

  audit({ actorId: actor.id, entity: "EmployeePermission", entityId: data.employeeId, action: "set", changes: { permissions: [before.map((b) => b.permission), permissions] } });
  updateTag(accessTagFor(data.employeeId));
  revalidatePath(`/employees/${data.employeeId}`);
  return { success: true };
}

// ─── Project-scoped grants (project page) ───

/** Admins, and the lead of the project, can hand out task powers on that one project. */
async function requireProjectDelegator(projectId: string) {
  const actor = await getCurrentEmployee();
  const project = await db.project.findUnique({ where: { id: projectId }, select: { leadId: true } });
  if (!project) throw new Error("Project not found.");
  if (!canManageAccess(actor.role) && project.leadId !== actor.id && !(await checkPermission("project:update", projectId))) {
    throw new Error("Only Admins and the project lead can change project permissions.");
  }
  return actor;
}

function assertProjectPermission(permission: string): asserts permission is Permission {
  if (!PROJECT_SCOPED_PERMISSIONS.includes(permission as Permission)) {
    throw new Error(`“${permission}” can't be given for a single project.`);
  }
}

export async function grantProjectPermissionAction(data: { employeeId: string; permission: string; projectId: string; expiresAt?: string | null }) {
  assertProjectPermission(data.permission);
  const actor = await requireProjectDelegator(data.projectId);
  if (data.employeeId === actor.id) throw new Error("You can't change your own permissions.");

  const target = await db.employee.findUnique({ where: { id: data.employeeId }, select: { role: true } });
  if (!target) throw new Error("Employee not found.");
  if (isAdminRole(target.role)) throw new Error("Admins and Super Admins already have every permission.");

  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  const existing = await db.employeePermission.findFirst({
    where: { employeeId: data.employeeId, permission: data.permission, projectId: data.projectId },
    select: { id: true },
  });
  const permission = existing
    ? await db.employeePermission.update({ where: { id: existing.id }, data: { grantedBy: actor.id, grantedAt: new Date(), expiresAt } })
    : await db.employeePermission.create({
        data: { employeeId: data.employeeId, permission: data.permission, projectId: data.projectId, grantedBy: actor.id, expiresAt },
      });

  audit({ actorId: actor.id, entity: "EmployeePermission", entityId: data.employeeId, action: "grant", changes: { permission: data.permission, projectId: data.projectId } });
  updateTag(accessTagFor(data.employeeId));
  revalidatePath(`/projects/${data.projectId}`);
  return { success: true, permission };
}

export async function revokeProjectPermissionAction(data: { employeeId: string; permission: string; projectId: string }) {
  assertProjectPermission(data.permission);
  const actor = await requireProjectDelegator(data.projectId);
  if (data.employeeId === actor.id) throw new Error("You can't change your own permissions.");

  await db.employeePermission.deleteMany({
    where: { employeeId: data.employeeId, permission: data.permission, projectId: data.projectId },
  });

  audit({ actorId: actor.id, entity: "EmployeePermission", entityId: data.employeeId, action: "revoke", changes: { permission: data.permission, projectId: data.projectId } });
  updateTag(accessTagFor(data.employeeId));
  revalidatePath(`/projects/${data.projectId}`);
  return { success: true };
}
