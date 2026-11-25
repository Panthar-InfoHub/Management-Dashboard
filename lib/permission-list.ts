// Every permission a person can be given through a preset or a personal grant.
// Admins and Super Admins have all of them; Members have none by default.
// Client-safe: no server imports.

export const PERMISSION_GROUPS = [
  {
    label: "Tasks",
    items: [
      { id: "task:create", label: "Create tasks in any project" },
      { id: "task:update", label: "Edit any task" },
      { id: "task:delete", label: "Delete any task" },
      { id: "task:assign", label: "Assign any task" },
    ],
  },
  {
    label: "Projects",
    items: [
      { id: "project:create", label: "Create projects" },
      { id: "project:update", label: "Edit any project and its members" },
      { id: "project:delete", label: "Delete projects" },
    ],
  },
  {
    label: "Teams",
    items: [
      { id: "team:create", label: "Create teams" },
      { id: "team:update", label: "Edit any team and its members" },
      { id: "team:delete", label: "Delete teams" },
    ],
  },
  {
    label: "People",
    items: [
      { id: "employee:view-all", label: "See full profiles and employment records" },
      { id: "employee:create", label: "Add and invite people" },
      { id: "employee:update", label: "Edit profiles, codes and promotions" },
      { id: "employee:offboard", label: "Offboard people" },
      { id: "employee:delete", label: "Delete people who never joined" },
    ],
  },
  {
    label: "Attendance",
    items: [
      { id: "attendance:view-all", label: "See everyone's attendance" },
      { id: "attendance:edit", label: "Fix attendance for others" },
      { id: "attendance:export", label: "Export attendance" },
    ],
  },
  {
    label: "Leave",
    items: [
      { id: "leave:approve", label: "Approve or reject anyone's requests" },
      { id: "leave:manage", label: "Edit leave types, balances and holidays" },
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["items"][number]["id"];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.id));

const PERMISSION_SET = new Set<string>(ALL_PERMISSIONS);
export function isPermission(value: string): value is Permission {
  return PERMISSION_SET.has(value);
}

/** Permissions that make sense for one project (used by project-scoped grants). */
export const PROJECT_SCOPED_PERMISSIONS: Permission[] = ["task:create", "task:update", "task:delete", "task:assign", "project:update"];
