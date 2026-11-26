import { UserError } from "@/lib/errors";
// ── Auth Helpers ──
// Bridge between Clerk identity and our Employee/permissions model.
// Every server-side function that needs "who is this user + what can they do?"
// should call getCurrentEmployee().

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { hasPermission, type Permission } from "@/lib/permissions";
import type { Employee } from "@/lib/generated/prisma";

export type AuthEmployee = Pick<
  Employee,
  "id" | "clerkId" | "email" | "firstName" | "lastName" | "role" | "status" | "teamId" | "avatarUrl" | "designation"
>;

import { cache } from "react";
import { VIEW_AS_ENABLED, getViewAsEmployee } from "@/lib/dev/view-as";

/**
 * Resolve the current Clerk session → our Employee record.
 * Call this at the top of every Server Action / API route.
 * Includes Just-In-Time (JIT) syncing if the webhook hasn't fired yet.
 */
async function resolveSignedInEmployee(): Promise<AuthEmployee> {
  const { userId } = await auth();

  if (!userId) {
    throw new UserError("Unauthorized: no active session");
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
    if (!user) throw new UserError("Unauthorized: user not found in Clerk");

    // Use the verified primary email specifically — not emailAddresses[0], which
    // isn't guaranteed to be the primary or even a verified address, and could be
    // used to link a Clerk account to someone else's pre-provisioned Employee record.
    const primaryEmail = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
    if (!primaryEmail || primaryEmail.verification?.status !== "verified") {
      throw new UserError("Unauthorized: primary email address is not verified");
    }
    const email = primaryEmail.emailAddress;

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
          avatarUrl: user.hasImage ? user.imageUrl : existingEmployee.avatarUrl
        },
        select: {
          id: true, clerkId: true, email: true, firstName: true,
          lastName: true, role: true, status: true, teamId: true,
          avatarUrl: true, designation: true,
        }
      });
      console.info("[auth] Linked an invited profile to its sign-in account");
    } else {
      // Brand new user, not invited. Signups are invite-only — the first ADMIN
      // is provisioned manually (sign up, then set the role directly in the
      // database), so there is no automatic bootstrap path here. Auto-creating
      // an ADMIN whenever the Employee table happened to be empty was a standing
      // account-takeover risk (e.g. after the last employee is removed).
      console.warn("[auth] Rejected a sign-up that had no invitation");
      throw new UserError("INVITATION_REQUIRED");
    }
  }

  if (employee.status === "INACTIVE") {
    throw new UserError("FORBIDDEN: This account has been deactivated.");
  }

  return employee as AuthEmployee;
}

/**
 * Resolve the current Clerk session → our Employee record.
 * Call this at the top of every Server Action / API route.
 * In local development only, "View as" (lib/dev/view-as.ts) swaps in another
 * employee so every role can be tested with one login.
 */
export const getCurrentEmployee = cache(async (): Promise<AuthEmployee> => {
  const me = await resolveSignedInEmployee();
  if (VIEW_AS_ENABLED) {
    const viewAs = await getViewAsEmployee(me.id);
    if (viewAs) return viewAs;
  }
  return me;
});

/**
 * Shorthand: get current employee and assert a permission in one call.
 * Returns the employee if authorized; throws otherwise.
 * Optionally checks if the user has the permission scoped to a specific project.
 */
export async function requireAuth(permission: Permission, projectId?: string): Promise<AuthEmployee> {
  const employee = await getCurrentEmployee();
  const hasPerm = await hasPermission(employee, permission, projectId);
  if (!hasPerm) {
    const scopeStr = projectId ? ` for project ${projectId}` : "";
    console.error(`[Auth] Forbidden: ${employee.email} (Role: ${employee.role}) attempted action requiring ${permission}${scopeStr}`);
    throw new UserError("You do not have permission for this action.");
  }
  return employee;
}

/**
 * Check a permission for the current user without throwing.
 * Useful for conditional rendering in RSCs.
 * Optionally checks if the user has the permission scoped to a specific project.
 */
export async function checkPermission(permission: Permission, projectId?: string): Promise<boolean> {
  try {
    const employee = await getCurrentEmployee();
    return await hasPermission(employee, permission, projectId);
  } catch {
    return false;
  }
}
