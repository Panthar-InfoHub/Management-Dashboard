"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

export async function createEmployeeAction(data: {
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  designation?: string;
}) {
  const admin = await requireAuth("employee:update:any");

  // Create employee with a pending clerkId. 
  // When they sign up via Clerk, the webhook should look them up by email and update this clerkId.
  const employee = await db.employee.create({
    data: {
      clerkId: `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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
