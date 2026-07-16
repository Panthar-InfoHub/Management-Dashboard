"use client";

import { useState } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { SubmitUpdateModal } from "@/components/modals/submit-update-modal";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={0}>
        <div className="flex min-h-screen">
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
          <div 
            className={cn(
              "flex flex-1 flex-col transition-all duration-200", 
              collapsed ? "pl-[60px]" : "pl-[240px]"
            )}
          >
            <TopNav />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
        <CommandPalette />
        <SubmitUpdateModal />
      </TooltipProvider>
    </ThemeProvider>
  );
}
