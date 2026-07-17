export type Permission = 
  | "task:create" | "task:update" | "task:delete"
  | "project:create" | "project:update" | "project:delete"
  | "team:create" | "team:update" | "team:delete"
  | "employee:create" | "employee:update" | "employee:delete";

export const ALL_PERMISSIONS: Permission[] = [
  "task:create", "task:update", "task:delete",
  "project:create", "project:update", "project:delete",
  "team:create", "team:update", "team:delete",
  "employee:create", "employee:update", "employee:delete"
];
