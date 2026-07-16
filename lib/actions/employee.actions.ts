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
  const admin = await requireAuth("employee:update:any");

  const client = await clerkClient();
  let clerkUserId: string;

  if (data.password) {
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
  } else {
    // 2. Fallback to invitation if no password provided
    clerkUserId = `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await client.invitations.createInvitation({
      emailAddress: data.email,
      publicMetadata: {
        role: data.role,
        designation: data.designation
      }
    });
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
  const admin = await requireAuth("employee:update:any");

  const employee = await db.employee.update({
    where: { id },
    data: {
      role: data.role,
      designation: data.designation,
    }
  });

  // Sync role to Clerk public metadata if the user has signed up
  if (!employee.clerkId.startsWith("pending_")) {
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
  const admin = await requireAuth("employee:delete:any");

  const employee = await db.employee.delete({
    where: { id }
  });

  // If they have a real Clerk account, delete them from Clerk as well
  if (!employee.clerkId.startsWith("pending_")) {
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
