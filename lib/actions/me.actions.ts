"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { VIEW_AS_COOKIE, VIEW_AS_ENABLED } from "@/lib/dev/view-as";

/** The signed-in person's role and company-wide permissions, for showing or hiding UI. */
export async function getMyAccessAction() {
  const me = await getCurrentEmployee();
  return {
    employeeId: me.id,
    name: `${me.firstName} ${me.lastName}`,
    role: me.role,
    permissions: await getEffectivePermissions(me),
    viewingAs: VIEW_AS_ENABLED && (await cookies()).has(VIEW_AS_COOKIE),
  };
}

// ── Local development only ──

export async function listViewAsOptionsAction() {
  if (!VIEW_AS_ENABLED) throw new Error("View as is off.");
  await getCurrentEmployee(); // must be signed in
  return db.employee.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, role: true, designation: true },
  });
}

export async function setViewAsAction(employeeId: string | null) {
  if (!VIEW_AS_ENABLED) throw new Error("View as is off.");
  await getCurrentEmployee();
  const jar = await cookies();
  if (employeeId) jar.set(VIEW_AS_COOKIE, employeeId, { httpOnly: true, sameSite: "lax", path: "/" });
  else jar.delete(VIEW_AS_COOKIE);
  return { success: true };
}
