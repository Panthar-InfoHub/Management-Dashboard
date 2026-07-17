export type Permission = 
  | "task:create" | "task:assign" | "task:update:own" | "task:update:any" | "task:delete" | "task:move:own" | "task:move:any"
  | "project:create" | "project:update" | "project:delete" | "project:view"
  | "team:create" | "team:update" | "team:manage-members"
  | "employee:view:all" | "employee:update:own" | "employee:update:any" | "employee:delete:any" | "employee:role:change"
  | "reports:view" | "reports:export"
  | "settings:view" | "audit:view";

export const ALL_PERMISSIONS: Permission[] = [
  "task:create", "task:assign", "task:update:own", "task:update:any", "task:delete", "task:move:own", "task:move:any",
  "project:create", "project:update", "project:delete", "project:view",
  "team:create", "team:update", "team:manage-members",
  "employee:view:all", "employee:update:own", "employee:update:any", "employee:delete:any", "employee:role:change",
  "reports:view", "reports:export",
  "settings:view", "audit:view"
];
