"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";

export async function createEmployeeAction(data: {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  password?: string;
  designation?: string;
}) {
  const currentEmployee = await requireAuth("employee:create");
  if (data.role === "ADMIN" && currentEmployee.role !== "ADMIN") {
    throw new Error("Only admins can create an ADMIN role.");
  }

  const client = await clerkClient();
  let clerkUserId: string;

  if (data.password) {
    try {
      // 1. Create the user directly in Clerk with a password
      const newUser = await client.users.createUser({
        emailAddress: [data.email],
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        publicMetadata: {
          role: data.role,
          designation: data.designation
        }
      });
      clerkUserId = newUser.id;
    } catch (error: any) {
      if (error.errors && error.errors.length > 0) {
        throw new Error(error.errors[0].message || "Failed to create user in authentication provider.");
      }
      throw new Error("Failed to create user. Please check the password requirements.");
    }
  } else {
    try {
      // 2. Fallback to invitation if no password provided
      clerkUserId = `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await client.invitations.createInvitation({
        emailAddress: data.email,
        publicMetadata: {
          role: data.role,
          designation: data.designation
        }
      });
    } catch (error: any) {
      if (error.errors && error.errors.length > 0) {
        throw new Error(error.errors[0].message || "Failed to send invitation.");
      }
      throw new Error("Failed to create invitation.");
    }
  }

  // 3. Create the database record
  const employee = await db.employee.create({
    data: {
      clerkId: clerkUserId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      designation: data.designation,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${data.firstName} ${data.lastName}`,
    }
  });

  revalidatePath("/employees");
  return employee;
}

export async function updateEmployeeAction(id: string, data: {
  role: string;
  designation?: string;
}) {
  const currentEmployee = await requireAuth("employee:update");

  const target = await db.employee.findUnique({ where: { id } });
  if (target?.role === "ADMIN" && currentEmployee.role !== "ADMIN") {
    throw new Error("Only admins can modify an ADMIN user.");
  }
  if (data.role === "ADMIN" && currentEmployee.role !== "ADMIN") {
    throw new Error("Only admins can assign an ADMIN role.");
  }

  const employee = await db.employee.update({
    where: { id },
    data: {
      role: data.role,
      designation: data.designation,
    }
  });

  // Sync role to Clerk public metadata if the user has signed up
  if (!employee.clerkId.startsWith("pending_") && !employee.clerkId.startsWith("seed_")) {
    const client = await clerkClient();
    await client.users.updateUserMetadata(employee.clerkId, {
      publicMetadata: {
        role: employee.role,
        designation: employee.designation
      }
    });
  }

  revalidatePath("/employees");
  return employee;
}

export async function deleteEmployeeAction(id: string) {
  const currentEmployee = await requireAuth("employee:delete");

  const target = await db.employee.findUnique({ where: { id } });
  if (target?.role === "ADMIN" && currentEmployee.role !== "ADMIN") {
    throw new Error("Only admins can delete an ADMIN user.");
  }

  let employee;
  try {
    employee = await db.employee.delete({
      where: { id }
    });
  } catch (error: any) {
    if (error.code === 'P2003') {
      throw new Error("Cannot delete this employee because they are currently assigned as a Team Lead, Project Lead, or Task Creator. Please reassign their responsibilities or mark their status as 'INACTIVE' instead.");
    }
    throw error;
  }

  // If they have a real Clerk account, delete them from Clerk as well
  if (!employee.clerkId.startsWith("pending_") && !employee.clerkId.startsWith("seed_")) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(employee.clerkId);
    } catch (error) {
      console.error("Failed to delete user in Clerk:", error);
    }
  }

  revalidatePath("/employees");
  return employee;
}
