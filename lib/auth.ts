// ── Auth Helpers ──
// Bridge between Clerk identity and our Employee/permissions model.
// Every server-side function that needs "who is this user + what can they do?"
// should call getCurrentEmployee().

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { hasPermission, type Permission } from "@/lib/permissions";
import { getDefaultLeaveBalances } from "@/lib/leave-config";
import type { Employee } from "@prisma/client";

export type AuthEmployee = Pick<
  Employee,
  "id" | "clerkId" | "email" | "firstName" | "lastName" | "role" | "status" | "teamId" | "avatarUrl" | "designation"
>;

/**
 * Resolve the current Clerk session → our Employee record.
 * Call this at the top of every Server Action / API route.
 * Includes Just-In-Time (JIT) syncing if the webhook hasn't fired yet.
 */
export async function getCurrentEmployee(): Promise<AuthEmployee> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized: no active session");
  }

  let employee = await db.employee.findUnique({
    where: { clerkId: userId },
    select: {
      id: true, clerkId: true, email: true, firstName: true,
      lastName: true, role: true, status: true, teamId: true,
      avatarUrl: true, designation: true,
    },
  });

  // ── Just-In-Time (JIT) Sync ──
  // If webhook failed or isn't set up (local dev), fetch from Clerk.
  if (!employee) {
    const user = await currentUser();
    if (!user) throw new Error("Unauthorized: user not found in Clerk");

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) throw new Error("User must have an email address");

    // Check if the user was invited manually from the dashboard (exists by email)
    const existingEmployee = await db.employee.findUnique({
      where: { email }
    });

    if (existingEmployee) {
      // They were invited! Link their new Clerk ID to the existing profile
      employee = await db.employee.update({
        where: { email },
        data: {
          clerkId: user.id,
          // Only override avatar if the user actually uploaded one to Clerk
          avatarUrl: user.imageUrl.includes("gravatar") ? existingEmployee.avatarUrl : user.imageUrl
        },
        select: {
          id: true, clerkId: true, email: true, firstName: true,
          lastName: true, role: true, status: true, teamId: true,
          avatarUrl: true, designation: true,
        }
      });
      console.log(`[JIT Sync] Linked invited profile for ${email} to Clerk ID`);
    } else {
      // Brand new user (not invited)
      const userCount = await db.employee.count();
      
      // Allow the very first user ever to become the Admin
      if (userCount === 0) {
        employee = await db.employee.create({
          data: {
            clerkId: user.id,
            email: email,
            firstName: user.firstName || "Admin",
            lastName: user.lastName || "User",
            avatarUrl: user.imageUrl,
            role: "ADMIN",
            leaveBalances: {
              create: getDefaultLeaveBalances(),
            },
          },
          select: {
            id: true, clerkId: true, email: true, firstName: true,
            lastName: true, role: true, status: true, teamId: true,
            avatarUrl: true, designation: true,
          },
        });
        console.log(`[JIT Sync] Created initial ADMIN record for ${email}`);
      } else {
        // Platform is already initialized, reject uninvited users
        console.log(`[Auth Blocked] Rejected uninvited signup attempt from ${email}`);
        throw new Error("INVITATION_REQUIRED");
      }
    }
  }

  return employee;
}

/**
 * Shorthand: get current employee and assert a permission in one call.
 * Returns the employee if authorized; throws otherwise.
 */
export async function requireAuth(permission: Permission): Promise<AuthEmployee> {
  const employee = await getCurrentEmployee();
  const hasPerm = await hasPermission(employee.role, permission);
  if (!hasPerm) {
    console.error(`[Auth] Forbidden: ${employee.email} (Role: ${employee.role}) attempted action requiring ${permission}`);
    throw new Error("You do not have permission for this action.");
  }
  return employee;
}

/**
 * Check a permission for the current user without throwing.
 * Useful for conditional rendering in RSCs.
 */
export async function checkPermission(permission: Permission): Promise<boolean> {
  try {
    const employee = await getCurrentEmployee();
    return await hasPermission(employee.role, permission);
  } catch {
    return false;
  }
}
