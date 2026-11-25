// Reference data that changes rarely and is the same for every user.
// Cached across requests; Server Actions that change it call updateTag().
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache/tags";

export async function getRoleNames(): Promise<string[]> {
  "use cache";
  cacheTag(CACHE_TAGS.roles);
  cacheLife("hours");

  const roles = await db.systemRole.findMany({
    select: { name: true },
    orderBy: { createdAt: "asc" },
  });
  return roles.map((r) => r.name);
}

/** Permissions granted by a role, or null when the role does not exist. */
export async function getRolePermissions(roleName: string): Promise<string[] | null> {
  "use cache";
  cacheTag(CACHE_TAGS.roles);
  cacheLife("hours");

  const role = await db.systemRole.findUnique({
    where: { name: roleName },
    select: { permissions: true },
  });
  return role?.permissions ?? null;
}
