export type Permission = 
  | "task:create" | "task:assign" | "task:update:own" | "task:update:any" | "task:delete" | "task:move:own" | "task:move:any"
  | "project:create" | "project:update" | "project:delete" | "project:view"
  | "team:create" | "team:update" | "team:manage-members"
  | "employee:view:all" | "employee:update:own" | "employee:update:any" | "employee:delete:any" | "employee:role:change"
  | "update:submit" | "update:view:team" | "update:view:all"
  | "leave:request" | "leave:approve" | "leave:view:team" | "leave:view:all" | "leave:balance:edit"
  | "attendance:view:own" | "attendance:view:team" | "attendance:view:all" | "attendance:edit"
  | "reports:view" | "reports:export"
  | "settings:view" | "audit:view";

export const ALL_PERMISSIONS: Permission[] = [
  "task:create", "task:assign", "task:update:own", "task:update:any", "task:delete", "task:move:own", "task:move:any",
  "project:create", "project:update", "project:delete", "project:view",
  "team:create", "team:update", "team:manage-members",
  "employee:view:all", "employee:update:own", "employee:update:any", "employee:delete:any", "employee:role:change",
  "update:submit", "update:view:team", "update:view:all",
  "leave:request", "leave:approve", "leave:view:team", "leave:view:all", "leave:balance:edit",
  "attendance:view:own", "attendance:view:team", "attendance:view:all", "attendance:edit",
  "reports:view", "reports:export",
  "settings:view", "audit:view"
];
