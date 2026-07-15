"use client";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { CommandPalette } from "@/components/layout/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delayDuration={0}>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col pl-[240px] transition-all duration-200">
            <TopNav />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
        <CommandPalette />
      </TooltipProvider>
    </ThemeProvider>
  );
}
