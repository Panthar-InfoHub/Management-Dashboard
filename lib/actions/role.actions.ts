"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";

export async function getSystemRolesAction() {
  await requireAuth("role:manage");
  return await db.systemRole.findMany({
    orderBy: { createdAt: 'asc' }
  });
}

export async function updateSystemRolePermissionsAction(name: string, permissions: string[]) {
  const actor = await requireAuth("role:manage");
  
  // Prevent removing admin permissions from the core ADMIN role
  if (name === "ADMIN") {
    throw new Error("Cannot modify core ADMIN permissions");
  }

  const role = await db.systemRole.update({
    where: { name },
    data: { permissions }
  });

  updateTag(CACHE_TAGS.roles);
  audit({ actorId: actor.id, entity: "SystemRole", entityId: name, action: "update", changes: { permissions } });
  revalidatePath("/settings");
  revalidatePath("/employees");
  return role;
}

export async function createSystemRoleAction(name: string, permissions: string[]) {
  const actor = await requireAuth("role:manage");

  const normalizedName = name.toUpperCase().replace(/\s+/g, '_');
  if (normalizedName === "ADMIN") {
    throw new Error("Cannot create a role named ADMIN.");
  }

  const role = await db.systemRole.create({
    data: {
      name: normalizedName,
      permissions,
      isSystem: false
    }
  });

  updateTag(CACHE_TAGS.roles);
  audit({ actorId: actor.id, entity: "SystemRole", entityId: role.name, action: "create", changes: { permissions } });
  revalidatePath("/settings");
  revalidatePath("/employees");
  return role;
}

export async function deleteSystemRoleAction(name: string) {
  const actor = await requireAuth("role:manage");

  const role = await db.systemRole.findUnique({ where: { name } });
  if (role?.isSystem) {
    throw new Error("Cannot delete a system-level role");
  }

  await db.systemRole.delete({ where: { name } });
  
  updateTag(CACHE_TAGS.roles);
  audit({ actorId: actor.id, entity: "SystemRole", entityId: name, action: "delete" });
  revalidatePath("/settings");
  revalidatePath("/employees");
  return true;
}
