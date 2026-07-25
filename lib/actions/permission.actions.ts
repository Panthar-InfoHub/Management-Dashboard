"use server";

import { db } from "@/lib/db";
import { requireAuth, getCurrentEmployee } from "@/lib/auth";
import { ALL_PERMISSIONS, type Permission } from "@/lib/permission-list";
import { revalidatePath } from "next/cache";

/**
 * Grant a specific permission to an individual employee.
 * Can be global (projectId is null) or scoped to a specific project.
 */
export async function grantPermissionAction(data: {
  employeeId: string;
  permission: string;
  projectId?: string | null;
  expiresAt?: string; // ISO date string, null = permanent
}) {
  // Use the new permission:delegate right instead of requiring full role:manage.
  const currentEmployee = await requireAuth("permission:delegate");

  // Validate the permission string
  if (!ALL_PERMISSIONS.includes(data.permission as Permission)) {
    throw new Error(`Invalid permission: ${data.permission}`);
  }

  // Prevent granting role:manage or permission:delegate to non-ADMINs
  if ((data.permission === "role:manage" || data.permission === "permission:delegate") && currentEmployee.role !== "ADMIN") {
    throw new Error("Only ADMINs can grant role:manage or permission:delegate.");
  }

  // Cannot grant permissions to yourself
  if (data.employeeId === currentEmployee.id) {
    throw new Error("You cannot grant permissions to yourself.");
  }

  // Check target exists and is active
  const target = await db.employee.findUnique({ where: { id: data.employeeId } });
  if (!target) throw new Error("Employee not found.");
  if (target.status !== "ACTIVE") throw new Error("Cannot grant permissions to an inactive employee.");
  if (target.role === "ADMIN") throw new Error("ADMINs already have all permissions.");

  // If scoped to a project, verify the project exists
  if (data.projectId) {
    const project = await db.project.findUnique({ where: { id: data.projectId } });
    if (!project) throw new Error("Project not found.");
  }

  // Prisma compound unique constraints don't accept nulls for optional fields in upsert.
  // We handle it manually with findFirst + update/create.
  const existing = await db.employeePermission.findFirst({
    where: {
      employeeId: data.employeeId,
      permission: data.permission,
      projectId: data.projectId || null,
    },
  });

  let permission;
  if (existing) {
    permission = await db.employeePermission.update({
      where: { id: existing.id },
      data: {
        grantedBy: currentEmployee.id,
        grantedAt: new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  } else {
    permission = await db.employeePermission.create({
      data: {
        employeeId: data.employeeId,
        permission: data.permission,
        projectId: data.projectId || null,
        grantedBy: currentEmployee.id,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  }

  revalidatePath(`/employees/${data.employeeId}`);
  if (data.projectId) revalidatePath(`/projects/${data.projectId}`);
  return { success: true, permission };
}

/**
 * Revoke a specific permission from an employee.
 * Must provide projectId if revoking a project-scoped permission.
 */
export async function revokePermissionAction(data: {
  employeeId: string;
  permission: string;
  projectId?: string | null;
}) {
  const currentEmployee = await requireAuth("permission:delegate");

  // Cannot revoke your own permissions
  if (data.employeeId === currentEmployee.id) {
    throw new Error("You cannot revoke your own permissions.");
  }

  await db.employeePermission.deleteMany({
    where: {
      employeeId: data.employeeId,
      permission: data.permission,
      projectId: data.projectId || null,
    },
  });

  revalidatePath(`/employees/${data.employeeId}`);
  if (data.projectId) revalidatePath(`/projects/${data.projectId}`);
  return { success: true };
}

/**
 * Get all per-user permissions for an employee (with granter details).
 */
export async function getEmployeePermissionsAction(employeeId: string) {
  const currentEmployee = await getCurrentEmployee();

  // Only ADMIN/MANAGER or the user themselves can view permissions
  if (
    currentEmployee.role !== "ADMIN" &&
    currentEmployee.role !== "MANAGER" &&
    currentEmployee.id !== employeeId
  ) {
    throw new Error("You do not have permission to view this information.");
  }

  const permissions = await db.employeePermission.findMany({
    where: { employeeId },
    orderBy: { grantedAt: "desc" },
  });

  // Fetch granter names
  const granterIds = [...new Set(permissions.map((p) => p.grantedBy))];
  const granters = await db.employee.findMany({
    where: { id: { in: granterIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const granterMap = new Map(granters.map((g) => [g.id, `${g.firstName} ${g.lastName}`]));

  return permissions.map((p) => ({
    ...p,
    granterName: granterMap.get(p.grantedBy) || "Unknown",
    isExpired: p.expiresAt ? p.expiresAt < new Date() : false,
  }));
}

/**
 * Bulk update permissions for an employee — sets exactly the given permissions,
 * revoking any not in the list.
 */
export async function setEmployeePermissionsAction(data: {
  employeeId: string;
  permissions: string[];
}) {
  const currentEmployee = await requireAuth("role:manage");

  // Validate all permissions
  for (const p of data.permissions) {
    if (!ALL_PERMISSIONS.includes(p as Permission)) {
      throw new Error(`Invalid permission: ${p}`);
    }
  }

  // Prevent granting role:manage unless ADMIN
  if (data.permissions.includes("role:manage") && currentEmployee.role !== "ADMIN") {
    throw new Error("Only ADMINs can grant the role:manage permission.");
  }

  if (data.employeeId === currentEmployee.id) {
    throw new Error("You cannot modify your own permissions.");
  }

  const target = await db.employee.findUnique({ where: { id: data.employeeId } });
  if (!target) throw new Error("Employee not found.");
  if (target.role === "ADMIN") throw new Error("ADMINs already have all permissions.");

  await db.$transaction(async (tx) => {
    // Remove all existing per-user permissions
    await tx.employeePermission.deleteMany({
      where: { employeeId: data.employeeId },
    });

    // Create new ones
    if (data.permissions.length > 0) {
      await tx.employeePermission.createMany({
        data: data.permissions.map((permission) => ({
          employeeId: data.employeeId,
          permission,
          grantedBy: currentEmployee.id,
        })),
      });
    }
  });

  revalidatePath(`/employees/${data.employeeId}`);
  revalidatePath("/employees");
  return { success: true };
}
