import { Suspense } from "react";
import { getEmployees } from "@/lib/queries/employee.queries";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { EmployeesClient } from "@/components/employees/employees-client";
import { getTeams } from "@/lib/queries/team.queries";
import { db } from "@/lib/db";
import EmployeesLoading from "./loading";

async function EmployeesData({ currentEmployee, canCreate, canUpdate, canDelete }: any) {
  const [employees, teams, roles] = await Promise.all([
    getEmployees(),
    getTeams(),
    db.systemRole.findMany({ select: { name: true } })
  ]);

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

export default async function EmployeesPage() {
  const currentEmployee = await getCurrentEmployee(); // fast

  const [canCreate, canUpdate, canDelete] = await Promise.all([
    checkPermission("employee:create"),
    checkPermission("employee:update"),
    checkPermission("employee:delete")
  ]);

  return (
    <Suspense fallback={<EmployeesLoading />}>
      <EmployeesData 
        currentEmployee={currentEmployee}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </Suspense>
  );
}
