import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";

export async function getEmployees() {
  const employee = await getCurrentEmployee();

  const employees = await db.employee.findMany({
    orderBy: {
      firstName: "asc"
    }
  });

  return employees;
}
