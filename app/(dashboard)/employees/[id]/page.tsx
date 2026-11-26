import { Suspense } from "react";
import { connection } from "next/server";
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
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <Link href="/employees" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Employees
      </Link>
      <Suspense fallback={<ProfileLoading />}>
        <EmployeeProfileDataAsync id={id} />
      </Suspense>
    </div>
  );
}

function ProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-40" /><Skeleton className="h-5 w-32" /></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2"><Skeleton className="h-72 w-full rounded-xl" /><Skeleton className="h-56 w-full rounded-xl" /></div>
        <div className="space-y-6"><Skeleton className="h-60 w-full rounded-xl" /><Skeleton className="h-28 w-full rounded-xl" /><Skeleton className="h-36 w-full rounded-xl" /></div>
      </div>
    </div>
  );
}

async function EmployeeProfileDataAsync({ id }: { id: string }) {
  await connection();
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
    <EmployeeProfileClient
      employee={JSON.parse(JSON.stringify(employee))}
      canEdit={canUpdate && mayActOn}
      canSetFlexibleWfh={canUpdate && mayActOn && employee.id !== currentEmployee.id && tracksAttendance(employee.role)}
      canAssignRoles={canAssignRoles(currentEmployee.role) && employee.id !== currentEmployee.id}
      canOffboard={canOffboard && mayActOn && employee.id !== currentEmployee.id}
      access={access}
      teams={teams}
      checklist={checklist}
      leave={leaveBalances && <LeaveBalancePanel employeeId={employee.id} employeeName={employee.firstName} year={leaveYear} balances={leaveBalances} />}
    />
  );
}
