import { Suspense } from "react";
import { getEmployees } from "@/lib/queries/employee.queries";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { EmployeesClient } from "@/components/employees/employees-client";
import { canAssignRoles } from "@/lib/access";
import { db } from "@/lib/db";
import { EmployeesBodySkeleton } from "./skeleton";

export default function EmployeesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organization Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage members and their platform access.</p>
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
  const teams = canCreate ? await db.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];

  return (
    <EmployeesClient 
      initialEmployees={employees} 
      teams={teams}
      canViewProfiles={canViewProfiles}
      canAssignRoles={canAssignRoles(currentEmployee.role)}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    />
  );
}
