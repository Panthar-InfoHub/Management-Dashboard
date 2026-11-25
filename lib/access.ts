// Role rules. Client-safe (no server imports) so pages and components share them.
//
// Roles are an access level only:
//   SUPER_ADMIN  everything, including managing admins. Not tracked in attendance.
//   ADMIN        everything except managing admins and super admins.
//   MEMBER       their own work, plus what presets, personal grants and the
//                teams/projects they lead give them.

export type AccessRole = "SUPER_ADMIN" | "ADMIN" | "MEMBER";
export const ACCESS_ROLES: AccessRole[] = ["SUPER_ADMIN", "ADMIN", "MEMBER"];

export const ROLE_LABELS: Record<AccessRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export type EmploymentTypeValue = "FULL_TIME" | "INTERN" | "CONTRACT";
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentTypeValue, string> = {
  FULL_TIME: "Full-time",
  INTERN: "Intern",
  CONTRACT: "Contract",
};

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === "SUPER_ADMIN";
}

/** Only admins and super admins give access (presets, personal grants). */
export function canManageAccess(actorRole: string): boolean {
  return isAdminRole(actorRole);
}

/** Only super admins change anyone's role. */
export function canAssignRoles(actorRole: string): boolean {
  return isSuperAdmin(actorRole);
}

/**
 * Whether the actor may change this person at all (edit, promote, offboard,
 * grant access). Members can be managed by anyone holding the right permission;
 * admins and super admins only by a super admin.
 */
export function canActOnEmployee(actorRole: string, targetRole: string): boolean {
  if (targetRole === "MEMBER") return true;
  return isSuperAdmin(actorRole);
}

/** Super admins don't clock in and never appear in attendance or leave. */
export function tracksAttendance(role: string): boolean {
  return role !== "SUPER_ADMIN";
}
