// Cache tags shared by "use cache" readers and the Server Actions that
// invalidate them with updateTag().
export const CACHE_TAGS = {
  /** Every person's presets and grants (a preset edit touches many people). */
  access: "access",
  presets: "access-presets",
} as const;

/** One person's presets and grants. */
export function accessTagFor(employeeId: string) {
  return `access:${employeeId}`;
}
