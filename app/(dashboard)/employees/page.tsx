import { getEmployees } from "@/lib/queries/employee.queries";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { EmployeesClient } from "@/components/employees/employees-client";
import { getTeams } from "@/lib/queries/team.queries";
import { db } from "@/lib/db";

export default async function EmployeesPage() {
  const currentEmployee = await getCurrentEmployee();
  const employees = await getEmployees();
  const teams = await getTeams();
  const roles = await db.systemRole.findMany({ select: { name: true } });

  const canCreate = await checkPermission("employee:create");
  const canUpdate = await checkPermission("employee:update");
  const canDelete = await checkPermission("employee:delete");

  return (
    <EmployeesClient 
      initialEmployees={JSON.parse(JSON.stringify(employees))} 
      teams={JSON.parse(JSON.stringify(teams))}
      availableRoles={roles.map((r:any) => r.name)}
      isAdmin={currentEmployee.role === "ADMIN"}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    />
  );
}
