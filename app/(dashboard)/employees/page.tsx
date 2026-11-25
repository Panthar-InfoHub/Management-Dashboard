import { Suspense } from "react";
import { getEmployees } from "@/lib/queries/employee.queries";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { EmployeesClient } from "@/components/employees/employees-client";
import { canAssignRoles } from "@/lib/access";
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
  const [currentEmployee, canViewProfiles, canCreate, canUpdate, canDelete, employees] = await Promise.all([
    getCurrentEmployee(),
    checkPermission("employee:view-all"),
    checkPermission("employee:create"),
    checkPermission("employee:update"),
    checkPermission("employee:delete"),
    getEmployees(),
  ]);

  return (
    <EmployeesClient 
      initialEmployees={employees} 
      canViewProfiles={canViewProfiles}
      canAssignRoles={canAssignRoles(currentEmployee.role)}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    />
  );
}
