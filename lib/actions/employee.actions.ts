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
  joinDate?: string;
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
  
  // 1. Check if user already exists in DB
  const existingDbUser = await db.employee.findUnique({ where: { email: data.email } });
  if (existingDbUser && existingDbUser.status === "ACTIVE") {
    throw new Error("An active employee with this email already exists.");
  }

  // 2. Check if user exists in Clerk
  const clerkUsers = await client.users.getUserList({ emailAddress: [data.email] });
  const existingClerkUser = clerkUsers.data[0];

  if (existingClerkUser) {
    clerkUserId = existingClerkUser.id;
    try {
      if (existingClerkUser.banned) {
        await client.users.unbanUser(clerkUserId);
      }
      if (data.password) {
        await client.users.updateUser(clerkUserId, { password: data.password });
      }
      await client.users.updateUserMetadata(clerkUserId, {
        publicMetadata: { role: data.role, designation: data.designation }
      });
    } catch (error: any) {
      throw new Error("Failed to restore existing user account in authentication provider.");
    }
  } else {
    // Standard creation/invite logic
    if (data.password) {
      try {
        const newUser = await client.users.createUser({
          emailAddress: [data.email],
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          publicMetadata: { role: data.role, designation: data.designation }
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
        // Clean up any existing pending invitations for this email to prevent duplicates
        const pendingInvites = await client.invitations.getInvitationList({ status: "pending" });
        const existingInvites = pendingInvites.data.filter(inv => inv.emailAddress === data.email);
        for (const inv of existingInvites) {
          await client.invitations.revokeInvitation(inv.id);
        }

        clerkUserId = `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await client.invitations.createInvitation({
          emailAddress: data.email,
          publicMetadata: { role: data.role, designation: data.designation }
        });
      } catch (error: any) {
        if (error.errors && error.errors.length > 0) {
          throw new Error(error.errors[0].message || "Failed to send invitation.");
        }
        throw new Error("Failed to create invitation.");
      }
    }
  }

  // 3. Create or Reactivate the database record
  try {
    let employee;
    
    if (existingDbUser) {
      // Rehire logic
      employee = await db.employee.update({
        where: { id: existingDbUser.id },
        data: {
          clerkId: clerkUserId,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          designation: data.designation,
          status: "ACTIVE",
          exitDate: null,
          // We intentionally DO NOT update joinDate here, because joinDate represents
          // their original first day at the company.
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${data.firstName} ${data.lastName}`,
        }
      });

      await db.employmentRecord.create({
        data: {
          employeeId: employee.id,
          designation: data.designation,
          startDate: data.joinDate ? new Date(data.joinDate) : new Date(),
          reason: "Rehired"
        }
      });
    } else {
      // Initial hire logic
      employee = await db.employee.create({
        data: {
          clerkId: clerkUserId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          designation: data.designation,
          joinDate: data.joinDate ? new Date(data.joinDate) : new Date(),
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${data.firstName} ${data.lastName}`,
        }
      });

      await db.employmentRecord.create({
        data: {
          employeeId: employee.id,
          designation: data.designation,
          startDate: data.joinDate ? new Date(data.joinDate) : new Date(),
          reason: "Initial Hire"
        }
      });
    }

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
  joinDate?: string;
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

  const employee = await db.$transaction(async (tx) => {
    const updated = await tx.employee.update({
      where: { id },
      data: {
        role: data.role,
        designation: data.designation,
        ...(data.joinDate && { joinDate: new Date(data.joinDate) })
      }
    });

    if (data.joinDate) {
      const oldJoinDateStr = target.joinDate.toISOString().split("T")[0];
      if (oldJoinDateStr !== data.joinDate) {
        const oldestRecord = await tx.employmentRecord.findFirst({
          where: { employeeId: id },
          orderBy: { startDate: "asc" }
        });
        if (oldestRecord) {
          if (oldestRecord.endDate && new Date(data.joinDate) > oldestRecord.endDate) {
            throw new Error("Original Join Date cannot be set after the end date of their very first role.");
          }
          await tx.employmentRecord.update({
            where: { id: oldestRecord.id },
            data: { startDate: new Date(data.joinDate) }
          });
        }
      }
    }
    return updated;
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
  if (!target) throw new Error("Employee not found");
  if (target?.role === "ADMIN" && currentEmployee.role !== "ADMIN") {
    throw new Error("Only admins can delete an ADMIN user.");
  }
  if (target.id === currentEmployee.id) {
    throw new Error("You cannot delete your own account.");
  }

  // Check if they are currently leading any projects or teams
  const ledProjects = await db.project.count({ where: { leadId: id, status: { not: "ARCHIVED" } } });
  if (ledProjects > 0) {
    throw new Error("Cannot delete this employee because they are the Lead of one or more active projects. Please reassign those projects first.");
  }

  const ledTeams = await db.team.count({ where: { leadId: id } });
  if (ledTeams > 0) {
    throw new Error("Cannot delete this employee because they are the Lead of a team. Please reassign the team lead first.");
  }

  // Soft-delete: mark as INACTIVE and set exit date.
  // This preserves audit trails (tasks they created, employment records, etc.)
  // and avoids FK cascade failures.
  const employee = await db.$transaction(async (tx) => {
    // Close any active employment records
    await tx.employmentRecord.updateMany({
      where: { employeeId: id, endDate: null },
      data: { endDate: new Date(), reason: "Account removed" },
    });

    // Remove from project memberships
    await tx.projectMember.deleteMany({
      where: { employeeId: id },
    });

    // Mark as INACTIVE
    return tx.employee.update({
      where: { id },
      data: {
        status: "INACTIVE",
        exitDate: new Date(),
        teamId: null,
      },
    });
  });

  // If they have a real Clerk account, delete them from Clerk to revoke access
  if (!employee.clerkId.startsWith("pending_") && !employee.clerkId.startsWith("seed_")) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(employee.clerkId);
    } catch (error) {
      console.error("Failed to delete user in Clerk:", error);
    }
  }

  revalidatePath("/employees");
  revalidatePath("/");
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

export async function transitionRoleAction(employeeId: string, data: { newRole: string; newDesignation?: string; startDate: string; reason: string }) {
  const currentEmployee = await requireAuth("employee:update");
  if (currentEmployee.role !== "ADMIN" && currentEmployee.role !== "MANAGER") {
    throw new Error("Only Admin/Manager can transition roles.");
  }

  const target = await db.employee.findUnique({ where: { id: employeeId } });
  if (!target) throw new Error("Employee not found.");

  const startDateObj = new Date(data.startDate);
  
  // Ensure the new role doesn't start before they were even hired
  if (startDateObj < target.joinDate) {
    throw new Error("The new role's start date cannot be before the employee's original join date.");
  }

  // Ensure the new role doesn't start before their current role started
  const currentRecord = await db.employmentRecord.findFirst({
    where: { employeeId: employeeId, endDate: null }
  });
  
  if (currentRecord && startDateObj < currentRecord.startDate) {
    throw new Error("The new role's start date cannot be before the start date of their current role.");
  }

  // Transaction
  const updatedEmployee = await db.$transaction(async (tx) => {
    // 1. Close current active employment record
    await tx.employmentRecord.updateMany({
      where: { employeeId: employeeId, endDate: null },
      data: { endDate: new Date(data.startDate) }
    });

    // 2. Open new employment record
    await tx.employmentRecord.create({
      data: {
        employeeId,
        designation: data.newDesignation,
        startDate: new Date(data.startDate),
        reason: data.reason
      }
    });

    // 3. Update employee
    return tx.employee.update({
      where: { id: employeeId },
      data: {
        role: data.newRole,
        designation: data.newDesignation,
      }
    });
  });

  // Sync with Clerk if not pending
  if (!updatedEmployee.clerkId.startsWith("pending_") && !updatedEmployee.clerkId.startsWith("seed_")) {
    const client = await clerkClient();
    await client.users.updateUserMetadata(updatedEmployee.clerkId, {
      publicMetadata: {
        role: updatedEmployee.role,
        designation: updatedEmployee.designation
      }
    });
  }

  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
  revalidatePath("/records");
  return updatedEmployee;
}

export async function offboardEmployeeAction(employeeId: string, data: { endDate: string; reason: string }) {
  const currentEmployee = await requireAuth("employee:delete"); // Treat offboard like delete permission
  if (currentEmployee.role !== "ADMIN" && currentEmployee.role !== "MANAGER") {
    throw new Error("Only Admin/Manager can offboard employees.");
  }

  const target = await db.employee.findUnique({ where: { id: employeeId } });
  if (!target) throw new Error("Employee not found.");

  if (currentEmployee.id === employeeId) {
    throw new Error("You cannot offboard your own account.");
  }

  if (target.role === "ADMIN" && currentEmployee.role !== "ADMIN") {
    throw new Error("Only admins can offboard an ADMIN.");
  }

  // Check if they are currently leading any projects or teams
  const ledProjects = await db.project.count({ where: { leadId: employeeId, status: { not: "ARCHIVED" } } });
  if (ledProjects > 0) {
    throw new Error("Cannot offboard this employee because they are the Lead of one or more active projects. Please reassign those projects first.");
  }

  const ledTeams = await db.team.count({ where: { leadId: employeeId } });
  if (ledTeams > 0) {
    throw new Error("Cannot offboard this employee because they are the Lead of a team. Please reassign the team lead first.");
  }

  await db.$transaction(async (tx) => {
    // 1. Close active employment record
    await tx.employmentRecord.updateMany({
      where: { employeeId: employeeId, endDate: null },
      data: { endDate: new Date(data.endDate), reason: data.reason }
    });

    // 2. Mark Employee as INACTIVE, set exitDate, and remove from team
    await tx.employee.update({
      where: { id: employeeId },
      data: {
        status: "INACTIVE",
        exitDate: new Date(data.endDate),
        teamId: null
      }
    });

    // 4. Remove from active ProjectMember relations
    await tx.projectMember.deleteMany({
      where: { employeeId: employeeId }
    });
  });

  // Completely delete their active session/identity in Clerk.
  // This removes their access instantly. If they are rehired later, createEmployeeAction
  // will just generate a brand new invitation/Clerk ID and link it to their existing DB profile.
  if (!target.clerkId.startsWith("pending_") && !target.clerkId.startsWith("seed_")) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(target.clerkId);
    } catch (error) {
      console.error("Failed to delete user in Clerk:", error);
    }
  } else if (target.clerkId.startsWith("pending_")) {
    try {
      const client = await clerkClient();
      const pendingInvites = await client.invitations.getInvitationList({ status: "pending" });
      const existingInvites = pendingInvites.data.filter(inv => inv.emailAddress === target.email);
      for (const inv of existingInvites) {
        await client.invitations.revokeInvitation(inv.id);
      }
    } catch (error) {
      console.error("Failed to revoke pending invitation in Clerk:", error);
    }
  }

  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
  revalidatePath("/records");
  return { success: true };
}
