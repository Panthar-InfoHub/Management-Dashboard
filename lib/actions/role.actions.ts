"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getSystemRolesAction() {
  await requireAuth("settings:view");
  return await db.systemRole.findMany({
    orderBy: { createdAt: 'asc' }
  });
}

export async function updateSystemRolePermissionsAction(name: string, permissions: string[]) {
  await requireAuth("settings:view");
  
  // Prevent removing admin permissions from the core ADMIN role
  if (name === "ADMIN") {
    throw new Error("Cannot modify core ADMIN permissions");
  }

  const role = await db.systemRole.update({
    where: { name },
    data: { permissions }
  });

  revalidatePath("/settings");
  revalidatePath("/employees");
  return role;
}

export async function createSystemRoleAction(name: string, permissions: string[]) {
  await requireAuth("settings:view");
  
  const role = await db.systemRole.create({
    data: { 
      name: name.toUpperCase().replace(/\s+/g, '_'), 
      permissions,
      isSystem: false
    }
  });

  revalidatePath("/settings");
  revalidatePath("/employees");
  return role;
}

export async function deleteSystemRoleAction(name: string) {
  await requireAuth("settings:view");

  const role = await db.systemRole.findUnique({ where: { name } });
  if (role?.isSystem) {
    throw new Error("Cannot delete a system-level role");
  }

  await db.systemRole.delete({ where: { name } });
  
  revalidatePath("/settings");
  revalidatePath("/employees");
  return true;
}
