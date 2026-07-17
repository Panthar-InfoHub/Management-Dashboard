// ── Dashboard semantic color system ──
// Mirrors the Tailwind hues already used for status/priority badges across
// tasks/projects/employees, so dashboard charts read as the same product
// rather than an arbitrary palette. Order arrays fix category order for
// charts instead of relying on DB group-by order.

export const TASK_STATUS_ORDER = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "TESTING", "DONE"] as const;

export const TASK_STATUS_COLORS: Record<string, string> = {
  BACKLOG: "#6b7280", // gray-500
  TODO: "#64748b", // slate-500
  IN_PROGRESS: "#3b82f6", // blue-500
  REVIEW: "#a855f7", // purple-500
  TESTING: "#f59e0b", // amber-500
  DONE: "#10b981", // emerald-500
};

export const TASK_PRIORITY_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const TASK_PRIORITY_COLORS: Record<string, string> = {
  LOW: "#6b7280", // gray-500
  MEDIUM: "#3b82f6", // blue-500
  HIGH: "#f97316", // orange-500
  CRITICAL: "#ef4444", // red-500
};

export const PROJECT_STATUS_ORDER = ["PLANNING", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"] as const;

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANNING: "#a855f7", // purple-500
  ACTIVE: "#3b82f6", // blue-500
  PAUSED: "#f97316", // orange-500
  COMPLETED: "#10b981", // emerald-500
  ARCHIVED: "#6b7280", // gray-500
};

export const ROLE_ORDER = ["ADMIN", "MANAGER", "EMPLOYEE", "INTERN"] as const;

export const ROLE_COLORS: Record<string, string> = {
  ADMIN: "#a855f7", // purple-500
  MANAGER: "#3b82f6", // blue-500
  EMPLOYEE: "#6b7280", // gray-500
  INTERN: "#f59e0b", // amber-500
};

/** Sort a {name,value}[] group-by result into a fixed display order. */
export function sortByOrder<T extends { name: string }>(data: T[], order: readonly string[]): T[] {
  return [...data].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
}

export function formatEnumLabel(value: string): string {
  return value.replace("_", " ");
}
