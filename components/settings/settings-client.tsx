"use client";

import { KeyRound } from "lucide-react";
import { RolesTab } from "@/components/settings/roles-tab";

export function SettingsClient() {
  return (
    <div className="flex gap-6">
      {/* Sidebar nav */}
      <nav className="flex flex-col gap-0.5 w-48 shrink-0">
        <button
          className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors text-left bg-accent text-accent-foreground"
        >
          <KeyRound className="h-3.5 w-3.5" /> Roles & Permissions
        </button>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-10">
        <RolesTab />
      </div>
    </div>
  );
}
