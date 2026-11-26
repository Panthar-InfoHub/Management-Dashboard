"use client";

import { Suspense, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
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
  // The phone menu opens from the top bar and from "More" in the bottom bar.
  const [menuOpen, setMenuOpen] = useState(false);

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
            <TopNav menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
            {/* Room for the bottom bar on phones (plus the iPhone home-indicator area). */}
            <main className="flex-1 min-h-0 overflow-y-auto bg-muted/40 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 dark:bg-background">{children}</main>
            {/* Reads the URL, so it needs its own Suspense boundary (partial prerendering). */}
            <Suspense fallback={null}><BottomNav onMore={() => setMenuOpen(true)} /></Suspense>
          </div>
        </div>
        {ViewAsBar && <ViewAsBar />}
      </TooltipProvider>
    </AccessProvider>
  );
}

