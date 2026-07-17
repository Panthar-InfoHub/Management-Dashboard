"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { RolesTab } from "@/components/settings/roles-tab";

const tabs = [
  { value: "roles", label: "Roles & Permissions", icon: KeyRound },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("roles");

  return (
    <div className="space-y-6 p-6 h-full overflow-y-auto">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your workspace preferences and configurations.</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="flex flex-col gap-0.5 w-48 shrink-0">
          {tabs.map(item => (
            <button
              key={item.value}
              onClick={() => setActiveTab(item.value)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors text-left",
                activeTab === item.value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-3.5 w-3.5" /> {item.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-10">
          {activeTab === "roles" && (
            <RolesTab />
          )}
        </div>
      </div>
    </div>
  );
}
