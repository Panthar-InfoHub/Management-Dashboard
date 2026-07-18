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
  if (currentEmployee.role !== "ADMIN") {
    const targetRole = await db.systemRole.findUnique({ where: { name: data.role } });
    if (targetRole?.permissions.includes("role:manage")) {
      throw new Error("Only admins can create an employee with role-management permissions.");
    }
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
  try {
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
  } catch (error: any) {
    // If DB creation fails, attempt to rollback the Clerk user to prevent orphans
    if (data.password && clerkUserId) {
      await client.users.deleteUser(clerkUserId).catch(() => {});
    }
    throw new Error("Failed to save employee to database. Please try again.");
  }
}

export async function updateEmployeeAction(id: string, data: {
  role: string;
  designation?: string;
}) {
  const currentEmployee = await requireAuth("employee:update");

  const target = await db.employee.findUnique({ where: { id } });
  if (!target) throw new Error("Employee not found");

  if (id === currentEmployee.id && data.role !== target.role) {
    throw new Error("You cannot change your own role.");
  }
  if (target.role === "ADMIN" && currentEmployee.role !== "ADMIN") {
    throw new Error("Only admins can modify an ADMIN user.");
  }
  if (data.role === "ADMIN" && currentEmployee.role !== "ADMIN") {
    throw new Error("Only admins can assign an ADMIN role.");
  }
  if (data.role !== target.role && currentEmployee.role !== "ADMIN") {
    const targetRole = await db.systemRole.findUnique({ where: { name: data.role } });
    if (targetRole?.permissions.includes("role:manage")) {
      throw new Error("Only admins can assign a role with role-management permissions.");
    }
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

export async function reserveEmployeeSequenceAction(type: "PANTHAR" | "KAVACHX") {
  const currentEmployee = await requireAuth("employee:update");
  if (currentEmployee.role !== "ADMIN" && currentEmployee.role !== "MANAGER") {
    throw new Error("Only ADMIN or MANAGER can generate employee codes.");
  }
  
  const seqName = type === "PANTHAR" ? "SEQ_PANTHAR" : "SEQ_KAVACHX";
  const seq = await db.sequence.findUnique({
    where: { name: seqName }
  });
  
  return (seq?.value || 0) + 1;
}

export async function generateEmployeeCodeAction(employeeId: string, type: "PANTHAR" | "KAVACHX", joinDateStr: string, reservedSeq?: number) {
  const currentEmployee = await requireAuth("employee:update");
  
  if (currentEmployee.role !== "ADMIN" && currentEmployee.role !== "MANAGER") {
    throw new Error("Only ADMIN or MANAGER can generate employee codes.");
  }

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error("Employee not found.");

  if (type === "PANTHAR" && employee.pantharCode) {
    throw new Error("Panthar code already exists.");
  }
  if (type === "KAVACHX" && employee.kavachXCode) {
    throw new Error("KavachX code already exists.");
  }

  // Parse join date (assuming YYYY-MM-DD input from HTML date picker)
  const dateObj = new Date(joinDateStr);
  if (isNaN(dateObj.getTime())) throw new Error("Invalid join date.");

  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yy = String(dateObj.getFullYear()).slice(-2);
  const dateStr = `${dd}${mm}${yy}`;

  const seqName = type === "PANTHAR" ? "SEQ_PANTHAR" : "SEQ_KAVACHX";
  const prefix = type === "PANTHAR" ? "PTHUB" : "KAVACHX";

  // Atomic transaction
  const result = await db.$transaction(async (tx) => {
    // ALWAYS dynamically generate inside transaction to avoid race conditions!
    // We ignore reservedSeq entirely because we don't want to burn sequences upfront.
    const seq = await tx.sequence.upsert({
      where: { name: seqName },
      update: { value: { increment: 1 } },
      create: { name: seqName, value: 1 }
    });
    
    const finalSeqValue = seq.value;
    const newCode = `${prefix}-${dateStr}${finalSeqValue}`;

    return tx.employee.update({
      where: { id: employeeId },
      data: {
        ...(type === "PANTHAR" ? { pantharCode: newCode } : { kavachXCode: newCode })
      }
    });
  });

  revalidatePath("/employees");
  return result;
}

export async function getInvitationLinkAction(email: string) {
  const currentEmployee = await requireAuth("employee:update");
  if (currentEmployee.role !== "ADMIN" && currentEmployee.role !== "MANAGER") {
    throw new Error("Not authorized to view invitations.");
  }

  // A Manager may only fetch invite links for non-ADMIN invitees — otherwise a
  // Manager could hijack a pre-provisioned ADMIN's pending invitation and
  // complete the sign-up themselves.
  if (currentEmployee.role !== "ADMIN") {
    const invitedEmployee = await db.employee.findUnique({ where: { email } });
    if (invitedEmployee?.role === "ADMIN") {
      throw new Error("Only admins can view invitations for an ADMIN account.");
    }
  }

  const client = await clerkClient();
  const invites = await client.invitations.getInvitationList({ status: "pending" });
  const invite = invites.data.find((inv) => inv.emailAddress === email);
  
  if (!invite) {
    throw new Error("No pending invitation found for this email in Clerk.");
  }
  
  return invite.url;
}
