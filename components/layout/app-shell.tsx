"use client";

import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import dynamic from "next/dynamic";
import { AccessProvider } from "@/components/providers/access-provider";
import { cn } from "@/lib/utils";

// Local development only; the condition is constant, so production builds drop it.
const ViewAsBar =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_VIEW_AS === "1"
    ? dynamic(() => import("@/components/dev/view-as-bar").then((m) => m.ViewAsBar), { ssr: false })
    : null;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AccessProvider>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
          <div 
            className={cn(
              "flex flex-1 flex-col min-w-0 transition-all duration-200 pl-0", 
              collapsed ? "md:pl-[60px]" : "md:pl-[240px]"
            )}
          >
            <TopNav />
            <main className="flex-1 min-h-0 overflow-y-auto bg-background/50">{children}</main>
          </div>
        </div>
        {ViewAsBar && <ViewAsBar />}
      </TooltipProvider>
    </AccessProvider>
  );
}

