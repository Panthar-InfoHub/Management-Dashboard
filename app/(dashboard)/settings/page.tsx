import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { RolesTab } from "@/components/settings/roles-tab";

import { getCurrentEmployee } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const employee = await getCurrentEmployee();
  if (employee.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="space-y-6 p-6 h-full overflow-y-auto">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your workspace preferences and configurations.</p>
      </div>

      <div className="flex gap-6">
        {/* Content */}
        <div className="flex-1 min-w-0 pb-10">
          <RolesTab />
        </div>
      </div>
    </div>
  );
}
