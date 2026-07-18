import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";

export async function getEmployees() {
  const employee = await getCurrentEmployee();
  const isPrivileged = employee.role === "ADMIN" || employee.role === "MANAGER";

  const employees = await db.employee.findMany({
    where: {
      status: "ACTIVE"
    },
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

export async function getEmployeeById(id: string) {
  const currentEmployee = await getCurrentEmployee();
  const isPrivileged = currentEmployee.role === "ADMIN" || currentEmployee.role === "MANAGER";
  
  if (!isPrivileged) throw new Error("Unauthorized to view detailed employee profile");

  return db.employee.findUnique({
    where: { id },
    include: {
      employmentRecords: {
        orderBy: { startDate: 'desc' }
      }
    }
  });
}
