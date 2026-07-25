export type Permission = 
  | "task:create" | "task:update" | "task:delete" | "task:assign"
  | "project:create" | "project:update" | "project:delete"
  | "team:create" | "team:update" | "team:delete"
  | "employee:create" | "employee:update" | "employee:delete"
  | "role:manage" | "permission:delegate";

export const ALL_PERMISSIONS: Permission[] = [
  "task:create", "task:update", "task:delete", "task:assign",
  "project:create", "project:update", "project:delete",
  "team:create", "team:update", "team:delete",
  "employee:create", "employee:update", "employee:delete",
  "role:manage", "permission:delegate"
];
