"use client";

import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { SubmitUpdateModal } from "@/components/modals/submit-update-modal";
import { cn } from "@/lib/utils";

export function AppShell({ children, isAdmin }: { children: React.ReactNode, isAdmin: boolean }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
      <TooltipProvider delayDuration={0}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} isAdmin={isAdmin} />
          <div 
            className={cn(
              "flex flex-1 flex-col min-w-0 transition-all duration-200 pl-0", 
              collapsed ? "md:pl-[60px]" : "md:pl-[240px]"
            )}
          >
            <TopNav isAdmin={isAdmin} />
            <main className="flex-1 min-h-0 overflow-y-auto bg-background/50">{children}</main>
          </div>
        </div>
        <CommandPalette isAdmin={isAdmin} />
        {/* <SubmitUpdateModal /> Hidden for now as requested */}
      </TooltipProvider>
  );
}
