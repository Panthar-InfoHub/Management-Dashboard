"use server";
import { UserError } from "@/lib/errors";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { CLERK_WRITES_ENABLED } from "@/lib/clerk-writes";
import { createNotification } from "@/lib/notifications";
import { setTeams, teamIdsOf } from "@/lib/teams/membership";
import { recalculateBalances } from "@/lib/leave/balances";
import { canActOnEmployee, canAssignRoles, type AccessRole, type EmploymentTypeValue } from "@/lib/access";

const ROLE_VALUES: AccessRole[] = ["SUPER_ADMIN", "ADMIN", "MEMBER"];
const EMPLOYMENT_VALUES: EmploymentTypeValue[] = ["FULL_TIME", "INTERN", "CONTRACT"];

function assertRole(value: unknown): asserts value is AccessRole {
  if (!ROLE_VALUES.includes(value as AccessRole)) throw new UserError(`Invalid role: ${String(value)}`);
}
function assertEmploymentType(value: unknown): asserts value is EmploymentTypeValue {
  if (!EMPLOYMENT_VALUES.includes(value as EmploymentTypeValue)) throw new UserError(`Invalid employment type: ${String(value)}`);
}

export async function createEmployeeAction(data: {
  firstName: string;
  lastName: string;
  email: string;
  role?: AccessRole;
  employmentType?: EmploymentTypeValue;
  /** Teams to add them to (optional; people can start in no team). */
  teamIds?: string[];
  codeType?: "PANTHAR" | "KAVACHX" | null;
  password?: string;
  designation?: string;
  joinDate?: string;
}) {
  const currentEmployee = await requireAuth("employee:create");
  const role: AccessRole = data.role ?? "MEMBER";
  const employmentType: EmploymentTypeValue = data.employmentType ?? "FULL_TIME";
  assertRole(role);
  assertEmploymentType(employmentType);
  if (role !== "MEMBER" && !canAssignRoles(currentEmployee.role)) {
    throw new UserError("Only Super Admins can add an Admin or Super Admin.");
  }

  const client = await clerkClient();
  let clerkUserId: string;
  
  // 1. Check if user already exists in DB
  const existingDbUser = await db.employee.findUnique({ where: { email: data.email } });
  if (existingDbUser && existingDbUser.status === "ACTIVE") {
    throw new UserError("An active employee with this email already exists.");
  }

  const teamIds = [...new Set(data.teamIds ?? [])];
  if (teamIds.length && (await db.team.count({ where: { id: { in: teamIds } } })) !== teamIds.length) {
    throw new UserError("One of those teams no longer exists. Reload and pick again.");
  }

  if (!CLERK_WRITES_ENABLED) {
    // Demo/local: no Clerk invite or account; the profile waits as "invited".
    clerkUserId = existingDbUser?.clerkId ?? `pending_local_${Date.now()}`;
  } else {
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
        publicMetadata: { role, designation: data.designation }
      });
    } catch (error: any) {
      throw new UserError("Failed to restore existing user account in authentication provider.");
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
          publicMetadata: { role, designation: data.designation }
        });
        clerkUserId = newUser.id;
      } catch (error: any) {
        if (error.errors && error.errors.length > 0) {
          throw new UserError(error.errors[0].message || "Failed to create user in authentication provider.");
        }
        throw new UserError("Failed to create user. Please check the password requirements.");
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
          publicMetadata: { role, designation: data.designation }
        });
      } catch (error: any) {
        if (error.errors && error.errors.length > 0) {
          throw new UserError(error.errors[0].message || "Failed to send invitation.");
        }
        throw new UserError("Failed to create invitation.");
      }
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
          role,
          employmentType,
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
          reason: "Rehired",
          type: "REHIRED",
          teamId: teamIds[0] ?? null,
          changedById: currentEmployee.id,
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
          role,
          employmentType,
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
          reason: "Initial Hire",
          type: "JOINED",
          teamId: teamIds[0] ?? null,
          changedById: currentEmployee.id,
        }
      });
    }

    if (teamIds.length) await setTeams(db, employee.id, teamIds, []);

    // Optional employee code, from the join date, in the same step.
    if (data.codeType && !(data.codeType === "PANTHAR" ? employee.pantharCode : employee.kavachXCode)) {
      employee = await assignEmployeeCode(employee.id, data.codeType, (data.joinDate ?? new Date().toISOString().slice(0, 10)));
    }

    audit({ actorId: currentEmployee.id, entity: "Employee", entityId: employee.id, action: "create", changes: { email: employee.email, role: employee.role, teamIds, codeType: data.codeType ?? null } });
    revalidatePath("/employees");
    return employee;
  } catch (error: any) {
    // If DB creation fails, attempt to rollback the Clerk user to prevent orphans
    if (data.password && clerkUserId) {
      await client.users.deleteUser(clerkUserId).catch(() => {});
    }
    throw new UserError("Failed to save employee to database. Please try again.");
  }
}

export async function updateEmployeeAction(id: string, data: {
  role?: AccessRole;
  employmentType?: EmploymentTypeValue;
  designation?: string;
  joinDate?: string;
}) {
  const currentEmployee = await requireAuth("employee:update");

  const target = await db.employee.findUnique({ where: { id } });
  if (!target) throw new UserError("Employee not found");

  if (!canActOnEmployee(currentEmployee.role, target.role)) {
    throw new UserError("Only Super Admins can change an Admin or Super Admin.");
  }
  const roleChanged = data.role !== undefined && data.role !== target.role;
  if (roleChanged) {
    assertRole(data.role);
    if (id === currentEmployee.id) throw new UserError("You can't change your own role.");
    if (!canAssignRoles(currentEmployee.role)) throw new UserError("Only Super Admins can change roles.");
  }
  if (data.employmentType !== undefined) assertEmploymentType(data.employmentType);

  const employee = await db.$transaction(async (tx) => {
    const updated = await tx.employee.update({
      where: { id },
      data: {
        ...(roleChanged && { role: data.role }),
        ...(data.employmentType && { employmentType: data.employmentType }),
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
            throw new UserError("Original Join Date cannot be set after the end date of their very first role.");
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


  if (data.joinDate && target.joinDate.toISOString().slice(0, 10) !== data.joinDate) {
    // Allowance is prorated from the join date.
    await recalculateBalances([id], Number(new Date().toISOString().slice(0, 4)));
  }
  audit({ actorId: currentEmployee.id, entity: "Employee", entityId: id, action: "update", changes: JSON.parse(JSON.stringify(data)) });
  revalidatePath(`/employees/${id}`);
  revalidatePath("/employees");
  return employee;
}

/**
 * Remove someone who never joined (their invite was never accepted). Anyone
 * who has signed in is offboarded instead, so their history stays.
 */
export async function deleteEmployeeAction(id: string) {
  const currentEmployee = await requireAuth("employee:delete");

  const target = await db.employee.findUnique({ where: { id } });
  if (!target) throw new UserError("Employee not found");
  if (target.id === currentEmployee.id) throw new UserError("You cannot delete your own account.");
  if (!canActOnEmployee(currentEmployee.role, target.role)) {
    throw new UserError("Only Super Admins can remove an Admin or Super Admin.");
  }
  if (!target.clerkId.startsWith("pending_")) {
    throw new UserError(`${target.firstName} has already joined. Use Offboard instead, so their history is kept.`);
  }

  const leads = (await db.project.count({ where: { leadId: id } })) + (await db.team.count({ where: { leadId: id } }));
  if (leads > 0) throw new UserError("They're set as a project or team lead. Reassign that first.");

  await db.employee.delete({ where: { id } });

  if (CLERK_WRITES_ENABLED) {
    try {
      const client = await clerkClient();
      const pending = await client.invitations.getInvitationList({ status: "pending" });
      for (const inv of pending.data.filter((i) => i.emailAddress === target.email)) {
        await client.invitations.revokeInvitation(inv.id);
      }
    } catch (error) {
      console.error("Failed to revoke invitation in Clerk:", error);
    }
  }

  audit({ actorId: currentEmployee.id, entity: "Employee", entityId: id, action: "delete", changes: { email: target.email, neverJoined: true } });
  revalidatePath("/employees");
  revalidatePath("/");
  return { success: true };
}

export async function reserveEmployeeSequenceAction(type: "PANTHAR" | "KAVACHX") {
  await requireAuth("employee:update");

  const seqName = type === "PANTHAR" ? "SEQ_PANTHAR" : "SEQ_KAVACHX";
  const seq = await db.sequence.findUnique({
    where: { name: seqName }
  });
  
  return (seq?.value || 0) + 1;
}

/**
 * Next code in a series: PTHUB-/KAVACHX- + join date (DDMMYY) + running number.
 * The number is taken inside a transaction so two people never get the same one.
 * Internal helper (not exported to the client).
 */
async function assignEmployeeCode(employeeId: string, type: "PANTHAR" | "KAVACHX", joinDateStr: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(joinDateStr)) throw new UserError("Invalid join date.");
  const dateStr = `${joinDateStr.slice(8, 10)}${joinDateStr.slice(5, 7)}${joinDateStr.slice(2, 4)}`;
  const seqName = type === "PANTHAR" ? "SEQ_PANTHAR" : "SEQ_KAVACHX";
  const prefix = type === "PANTHAR" ? "PTHUB" : "KAVACHX";

  return db.$transaction(async (tx) => {
    const seq = await tx.sequence.upsert({
      where: { name: seqName },
      update: { value: { increment: 1 } },
      create: { name: seqName, value: 1 },
    });
    const newCode = `${prefix}-${dateStr}${seq.value}`;
    return tx.employee.update({
      where: { id: employeeId },
      data: type === "PANTHAR" ? { pantharCode: newCode } : { kavachXCode: newCode },
    });
  });
}

export async function generateEmployeeCodeAction(employeeId: string, type: "PANTHAR" | "KAVACHX", joinDateStr: string, reservedSeq?: number) {
  const currentEmployee = await requireAuth("employee:update");

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new UserError("Employee not found.");

  if (type === "PANTHAR" && employee.pantharCode) {
    throw new UserError("Panthar code already exists.");
  }
  if (type === "KAVACHX" && employee.kavachXCode) {
    throw new UserError("KavachX code already exists.");
  }

  const result = await assignEmployeeCode(employeeId, type, joinDateStr);

  audit({ actorId: currentEmployee.id, entity: "Employee", entityId: employeeId, action: "code", changes: { type } });
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
  return result;
}

export async function getInvitationLinkAction(email: string) {
  const currentEmployee = await requireAuth("employee:create");

  // Only a Super Admin may fetch an Admin's invite link — otherwise someone
  // could take over a pre-provisioned admin invitation by signing up themselves.
  const invitedEmployee = await db.employee.findUnique({ where: { email }, select: { role: true } });
  if (invitedEmployee && !canActOnEmployee(currentEmployee.role, invitedEmployee.role)) {
    throw new UserError("Only Super Admins can view invitations for an Admin account.");
  }

  const client = await clerkClient();
  const invites = await client.invitations.getInvitationList({ status: "pending" });
  const invite = invites.data.find((inv) => inv.emailAddress === email);
  
  if (!invite) {
    throw new UserError("No pending invitation found for this email in Clerk.");
  }
  
  return invite.url;
}

type TransitionInput = {
  type?: "PROMOTION" | "TRANSFER" | "TITLE_CHANGE";
  newRole?: AccessRole;
  newDesignation?: string;
  /** Teams after the change (a transfer adds and/or removes teams). Omit to keep them. */
  teamIds?: string[];
  startDate: string;
  reason: string;
};

const EVENT_LABELS = { PROMOTION: "Promotion", TRANSFER: "Transfer", TITLE_CHANGE: "Title change" } as const;

/** Promotion, transfer or title change: closes the current ledger entry and opens a new one. */
export async function transitionRoleAction(employeeId: string, data: TransitionInput) {
  const currentEmployee = await requireAuth("employee:update");
  const type = data.type ?? "PROMOTION";
  if (!(type in EVENT_LABELS)) throw new UserError("Choose Promotion, Transfer or Title change.");

  const target = await db.employee.findUnique({ where: { id: employeeId } });
  if (!target) throw new UserError("Employee not found.");
  if (target.status !== "ACTIVE") throw new UserError("Only active employees can be promoted or transferred.");
  if (!canActOnEmployee(currentEmployee.role, target.role)) {
    throw new UserError("Only Super Admins can change an Admin or Super Admin.");
  }
  const newRole = data.newRole ?? target.role;
  assertRole(newRole);
  if (newRole !== target.role) {
    if (employeeId === currentEmployee.id) throw new UserError("You can't change your own role.");
    if (!canAssignRoles(currentEmployee.role)) throw new UserError("Only Super Admins can change roles.");
  }

  // Team changes: compare the wanted teams with the current ones.
  const current = await teamIdsOf(employeeId);
  const wanted = data.teamIds ? [...new Set(data.teamIds)] : current;
  const join = wanted.filter((t) => !current.includes(t));
  const leave = current.filter((t) => !wanted.includes(t));
  if (join.length && (await db.team.count({ where: { id: { in: join } } })) !== join.length) throw new UserError("One of those teams no longer exists.");
  if (leave.length) {
    const led = await db.team.findFirst({ where: { id: { in: leave }, leadId: employeeId }, select: { name: true } });
    if (led) throw new UserError(`${target.firstName} leads ${led.name}. Choose a new lead for that team before they leave it.`);
  }

  const designation = data.newDesignation?.trim() || target.designation || null;
  if (type === "TRANSFER" && !join.length && !leave.length) throw new UserError("Change at least one team for a transfer.");
  if (type === "TITLE_CHANGE" && !data.newDesignation?.trim()) throw new UserError("Enter the new title.");
  const reason = data.reason?.trim();
  if (!reason) throw new UserError("Add a short reason.");

  const startDateObj = new Date(data.startDate);
  if (isNaN(startDateObj.getTime())) throw new UserError("Choose the date it takes effect.");
  if (startDateObj < target.joinDate) throw new UserError("It can't take effect before they joined.");
  const currentRecord = await db.employmentRecord.findFirst({ where: { employeeId, endDate: null } });
  if (currentRecord && startDateObj < currentRecord.startDate) {
    throw new UserError("It can't take effect before their current role started.");
  }

  const updatedEmployee = await db.$transaction(async (tx) => {
    await tx.employmentRecord.updateMany({ where: { employeeId, endDate: null }, data: { endDate: startDateObj } });
    await tx.employmentRecord.create({
      data: { employeeId, designation, startDate: startDateObj, reason, type, teamId: join[0] ?? null, changedById: currentEmployee.id },
    });
    await setTeams(tx, employeeId, join, leave);
    return tx.employee.update({ where: { id: employeeId }, data: { role: newRole, designation } });
  });

  const names = async (ids: string[]) => ids.length ? (await db.team.findMany({ where: { id: { in: ids } }, select: { name: true } })).map((t) => t.name).join(", ") : "";
  const [joinedNames, leftNames] = await Promise.all([names(join), names(leave)]);
  await createNotification({
    recipientId: employeeId,
    type: "EMPLOYMENT",
    title: EVENT_LABELS[type],
    message: [
      data.newDesignation?.trim() && `Your title is now ${designation}`,
      joinedNames && `you've joined ${joinedNames}`,
      leftNames && `you've left ${leftNames}`,
    ].filter(Boolean).join("; ") + ` (from ${data.startDate}).`,
    actionUrl: "/",
  });
  audit({ actorId: currentEmployee.id, entity: "Employee", entityId: employeeId, action: type.toLowerCase(), changes: JSON.parse(JSON.stringify({ ...data, designation, join, leave })) });
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
  revalidatePath("/records");
  revalidatePath("/teams");
  return updatedEmployee;
}

export async function offboardEmployeeAction(employeeId: string, data: { endDate: string; reason: string; unassignTasks?: boolean }) {
  const currentEmployee = await requireAuth("employee:offboard");

  const target = await db.employee.findUnique({ where: { id: employeeId } });
  if (!target) throw new UserError("Employee not found.");
  if (currentEmployee.id === employeeId) throw new UserError("You cannot offboard your own account.");
  if (!canActOnEmployee(currentEmployee.role, target.role)) {
    throw new UserError("Only Super Admins can offboard an Admin or Super Admin.");
  }
  if (target.status === "INACTIVE") throw new UserError(`${target.firstName} has already left.`);
  const reason = data.reason?.trim();
  if (!reason) throw new UserError("Add the reason they're leaving.");
  const endDate = new Date(data.endDate);
  if (isNaN(endDate.getTime())) throw new UserError("Choose their last day.");

  // Leads must be handed over first.
  const ledProjects = await db.project.count({ where: { leadId: employeeId, status: { not: "ARCHIVED" } } });
  if (ledProjects > 0) throw new UserError("They lead active projects. Choose new project leads first.");
  const ledTeams = await db.team.count({ where: { leadId: employeeId } });
  if (ledTeams > 0) throw new UserError("They lead a team. Choose a new team lead first.");

  const lastDayKey = data.endDate.slice(0, 10);
  const result = await db.$transaction(async (tx) => {
    // 1. Close the current ledger entry and add the exit.
    await tx.employmentRecord.updateMany({ where: { employeeId, endDate: null }, data: { endDate } });
    await tx.employmentRecord.create({
      data: { employeeId, designation: target.designation, startDate: endDate, endDate, reason, type: "EXITED", teamId: null, changedById: currentEmployee.id },
    });

    // 2. Requests: cancel pending ones, and approved ones after the last day.
    const cancelled = await tx.request.updateMany({
      where: {
        employeeId,
        OR: [{ status: "PENDING" }, { status: "APPROVED", startDate: { gt: new Date(`${lastDayKey}T00:00:00.000Z`) } }],
      },
      data: { status: "CANCELLED", decisionNote: "Cancelled at offboarding" },
    });

    // 3. Open tasks: unassign them so they show up as needing an owner.
    let unassigned = 0;
    if (data.unassignTasks) {
      const open = await tx.task.findMany({
        where: { status: { notIn: ["DONE", "CANCELLED"] }, assignees: { some: { id: employeeId } } },
        select: { id: true, ownerId: true, assignees: { where: { id: { not: employeeId } }, select: { id: true }, take: 1 } },
      });
      for (const t of open) {
        // If they owned it, the next assignee takes over (or it has no owner).
        const ownerId = t.ownerId === employeeId ? t.assignees[0]?.id ?? null : t.ownerId;
        await tx.task.update({ where: { id: t.id }, data: { ownerId, assignees: { disconnect: { id: employeeId } } } });
      }
      unassigned = open.length;
    }

    // 4. Inactive, off their team and projects.
    await tx.employee.update({ where: { id: employeeId }, data: { status: "INACTIVE", exitDate: endDate, teamId: null } });
    await tx.teamMembership.deleteMany({ where: { employeeId } });
    await tx.projectMember.deleteMany({ where: { employeeId } });
    return { cancelled: cancelled.count, unassigned };
  });

  // 5. Remove sign-in. (Skipped in demo, where Clerk is shared with production.)
  if (CLERK_WRITES_ENABLED) {
    try {
      const client = await clerkClient();
      if (!target.clerkId.startsWith("pending_") && !target.clerkId.startsWith("seed_")) {
        await client.users.deleteUser(target.clerkId);
      } else if (target.clerkId.startsWith("pending_")) {
        const pending = await client.invitations.getInvitationList({ status: "pending" });
        for (const inv of pending.data.filter((i) => i.emailAddress === target.email)) await client.invitations.revokeInvitation(inv.id);
      }
    } catch (error) {
      console.error("Failed to remove sign-in in Clerk:", error);
    }
  }

  audit({ actorId: currentEmployee.id, entity: "Employee", entityId: employeeId, action: "offboard", changes: { ...JSON.parse(JSON.stringify(data)), ...result } });
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
  revalidatePath("/records");
  revalidatePath("/tasks");
  return { success: true, ...result };
}
