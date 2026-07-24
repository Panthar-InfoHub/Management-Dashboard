"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { SubmitUpdateModal } from "@/components/modals/submit-update-modal";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useUser();
  // Role is synced to Clerk publicMetadata by employee actions —
  // reading it here avoids a blocking server-side DB call in the layout.
  const isAdmin = (user?.publicMetadata as any)?.role === "ADMIN";

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

