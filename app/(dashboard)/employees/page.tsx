import { Suspense } from "react";
import { getEmployees } from "@/lib/queries/employee.queries";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { EmployeesClient } from "@/components/employees/employees-client";
import { getTeams } from "@/lib/queries/team.queries";
import { getRoleNames } from "@/lib/queries/reference.queries";
import { EmployeesBodySkeleton } from "./skeleton";

export default function EmployeesPage() {
  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto selection:bg-primary/10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Organization Members</h1>
          <p className="text-sm text-muted-foreground">Manage members and their platform access.</p>
        </div>
      </div>
      <Suspense fallback={<EmployeesBodySkeleton />}>
        <EmployeesDataAsync />
      </Suspense>
    </div>
  );
}

async function EmployeesDataAsync() {
  const [currentEmployee, canCreate, canUpdate, canDelete, employees, teams, roles] = await Promise.all([
    getCurrentEmployee(),
    checkPermission("employee:create"),
    checkPermission("employee:update"),
    checkPermission("employee:delete"),
    getEmployees(),
    getTeams(),
    getRoleNames()
  ]);

  return (
    <EmployeesClient 
      initialEmployees={employees} 
      teams={teams}
      availableRoles={roles}
      isAdmin={currentEmployee.role === "ADMIN"}
      isManager={currentEmployee.role === "MANAGER"}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    />
  );
}
