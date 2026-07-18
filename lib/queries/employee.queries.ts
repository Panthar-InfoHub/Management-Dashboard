import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";

export async function getEmployees() {
  const employee = await getCurrentEmployee();
  const isPrivileged = employee.role === "ADMIN" || employee.role === "MANAGER";

  const employees = await db.employee.findMany({
    orderBy: {
      firstName: "asc"
    }
  });

  // Non-admin/manager viewers get the directory without personal/internal fields
  // (phone, Clerk identity linkage, HR codes) the UI never renders for them anyway —
  // strip them here so they never leave the server in the page payload.
  if (!isPrivileged) {
    return employees.map((e) => ({
      ...e,
      phone: null,
      clerkId: "",
      pantharCode: null,
      kavachXCode: null,
    }));
  }

  return employees;
}
