import { Suspense } from "react";
import { connection } from "next/server";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { getDefaultOffice, getLeaveTypes } from "@/lib/attendance/settings";
import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/settings/settings-client";
import { listAccessPresetsAction } from "@/lib/actions/access.actions";
import { isAdminRole } from "@/lib/access";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your workspace preferences and configurations.</p>
      </div>

      <Suspense fallback={
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-card p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full max-w-md" />
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-border/40 rounded-lg">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      }>
        <SettingsDataAsync />
      </Suspense>
    </div>
  );
}

async function SettingsDataAsync() {
  await connection();
  const [employee, canManageLeave] = await Promise.all([getCurrentEmployee(), checkPermission("leave:manage")]);
  const isAdmin = isAdminRole(employee.role);

  if (!isAdmin && !canManageLeave) {
    redirect("/");
  }

  const [presets, office, leaveTypes] = await Promise.all([
    isAdmin ? listAccessPresetsAction() : null,
    isAdmin ? getDefaultOffice() : null,
    canManageLeave ? getLeaveTypes({ includeInactive: true }) : null,
  ]);

  return <SettingsClient presets={presets} office={office} leaveTypes={leaveTypes} />;
}
