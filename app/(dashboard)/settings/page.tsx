import { getCurrentEmployee } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/settings/settings-client";
import { getSystemRolesAction } from "@/lib/actions/role.actions";

export default async function SettingsPage() {
  const employee = await getCurrentEmployee();

  if (employee.role !== "ADMIN") {
    redirect("/");
  }

  const roles = await getSystemRolesAction();

  return (
    <div className="space-y-6 p-6 h-full overflow-y-auto">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your workspace preferences and configurations.</p>
      </div>

      <SettingsClient initialRoles={JSON.parse(JSON.stringify(roles))} />
    </div>
  );
}
