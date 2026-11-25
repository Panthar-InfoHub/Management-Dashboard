// "View as": in local development only, act as another employee so every role
// and permission can be tested with one Clerk login.
//
// Both must be true or this is off:
//   - `next dev` (NODE_ENV === "development"); a production build never enables it
//   - NEXT_PUBLIC_DEV_VIEW_AS=1 in .env.local
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { AuthEmployee } from "@/lib/auth";

export const VIEW_AS_ENABLED =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_VIEW_AS === "1";

export const VIEW_AS_COOKIE = "dev-view-as";

/** The employee being viewed as, or null. `realId` is the signed-in person. */
export async function getViewAsEmployee(realId: string): Promise<AuthEmployee | null> {
  if (!VIEW_AS_ENABLED) return null;
  const id = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (!id || id === realId) return null;
  return db.employee.findUnique({
    where: { id },
    select: {
      id: true, clerkId: true, email: true, firstName: true,
      lastName: true, role: true, status: true, teamId: true,
      avatarUrl: true, designation: true,
    },
  });
}
