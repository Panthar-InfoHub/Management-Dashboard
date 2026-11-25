import { Suspense } from "react";
import { getEmployeeById } from "@/lib/queries/employee.queries";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { EmployeeProfileClient } from "@/components/employees/employee-profile-client";
import { db } from "@/lib/db";
import { canActOnEmployee, canAssignRoles, canManageAccess, tracksAttendance } from "@/lib/access";
import { getBalances } from "@/lib/leave/queries";
import { todayKey } from "@/lib/attendance/calendar";
import { LeaveBalancePanel } from "@/components/employees/leave-balance-panel";
import { getOffboardingChecklist } from "@/lib/employees/offboarding";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-6 p-6 md:p-8 w-full h-full overflow-y-auto selection:bg-primary/10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/employees" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm">
              <ArrowLeft className="h-4 w-4" /> Back to Directory
            </Link>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Employee Profile</h1>
          <p className="text-sm text-muted-foreground">Manage profile, role, and view employment ledger.</p>
        </div>
      </div>
      <Suspense fallback={<ProfileLoading />}>
        <EmployeeProfileDataAsync id={id} />
      </Suspense>
    </div>
  );
}

function ProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}

async function EmployeeProfileDataAsync({ id }: { id: string }) {
  const [currentEmployee, canView, canUpdate, canOffboard, canManageLeave] = await Promise.all([
    getCurrentEmployee(),
    checkPermission("employee:view-all"),
    checkPermission("employee:update"),
    checkPermission("employee:offboard"),
    checkPermission("leave:manage"),
  ]);

  if (!canView) {
    redirect("/employees");
  }

  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  const mayActOn = canActOnEmployee(currentEmployee.role, employee.role);
  const showAccess = canManageAccess(currentEmployee.role) && employee.role === "MEMBER" && employee.id !== currentEmployee.id;

  const access = showAccess
    ? await Promise.all([
        db.accessPreset.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, description: true, permissions: true } }),
        db.employeeAccessPreset.findMany({ where: { employeeId: id }, select: { presetId: true } }),
        db.employeePermission.findMany({ where: { employeeId: id, projectId: null }, select: { permission: true } }),
      ]).then(([presets, assigned, grants]) => ({
        presets,
        assignedPresetIds: assigned.map((a) => a.presetId),
        personalPermissions: grants.map((g) => g.permission),
      }))
    : null;

  // HR view of the leave balance (not for Super Admins, who aren't tracked, or yourself).
  const leaveYear = Number(todayKey("Asia/Kolkata").slice(0, 4));
  const leaveBalances =
    canManageLeave && tracksAttendance(employee.role) && employee.id !== currentEmployee.id && mayActOn
      ? await getBalances(employee.id, leaveYear)
      : null;

  const [teams, checklist] = await Promise.all([
    canUpdate && mayActOn ? db.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    canOffboard && mayActOn && employee.status === "ACTIVE" && employee.id !== currentEmployee.id ? getOffboardingChecklist(employee.id, employee.role) : Promise.resolve(null),
  ]);

  return (
    <>
    <EmployeeProfileClient
      employee={JSON.parse(JSON.stringify(employee))}
      canEdit={canUpdate && mayActOn}
      canAssignRoles={canAssignRoles(currentEmployee.role) && employee.id !== currentEmployee.id}
      canOffboard={canOffboard && mayActOn && employee.id !== currentEmployee.id}
      access={access}
      teams={teams}
      checklist={checklist}
    />
    {leaveBalances && (
      <div className="px-2 pb-20">
        <LeaveBalancePanel employeeId={employee.id} employeeName={employee.firstName} year={leaveYear} balances={leaveBalances} />
      </div>
    )}
    </>
  );
}
