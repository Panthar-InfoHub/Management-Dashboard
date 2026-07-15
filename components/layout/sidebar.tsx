"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, FolderKanban, Users, UserCircle, CalendarDays,
  FileText, Bell, BarChart3, Settings, ChevronLeft, ChevronRight,
  Zap, ClipboardCheck, Search, MessageSquare, PanelLeftClose, PanelLeft,
  Layers, Building2,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban, badge: "6" },
  { label: "Tasks", href: "/tasks", icon: ClipboardCheck, badge: "10" },
  { label: "Teams", href: "/teams", icon: Users },
  { label: "Employees", href: "/employees", icon: UserCircle, badge: "12" },
  { label: "Daily Updates", href: "/daily-updates", icon: MessageSquare, badge: "5" },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Reports", href: "/reports", icon: BarChart3 },
];

const bottomItems = [
  { label: "Notifications", href: "/notifications", icon: Bell, badge: "4" },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-14 items-center border-b border-border px-3", collapsed ? "justify-center" : "gap-2")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Zap className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-semibold text-foreground">Panthar</span>
            <span className="truncate text-[11px] text-muted-foreground">Team Operations</span>
          </div>
        )}
      </div>

      {/* Workspace indicator */}
      {!collapsed && (
        <div className="px-3 py-2">
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <Building2 className="h-3.5 w-3.5" />
            <span className="truncate">Engineering</span>
            <ChevronRight className="ml-auto h-3 w-3" />
          </button>
        </div>
      )}

      <Separator className={cn(collapsed && "mx-2")} />

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-2">
          <button className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors">
            <Search className="h-3.5 w-3.5" />
            <span>Search…</span>
            <kbd className="ml-auto rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Nav */}
      <ScrollArea className="flex-1 px-2 py-1">
        {!collapsed && <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Platform</p>}
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-foreground")} />
                {!collapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] font-medium">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2">
                    {item.label}
                    {item.badge && <Badge variant="secondary" className="text-[10px]">{item.badge}</Badge>}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return link;
          })}
        </nav>
      </ScrollArea>

      <Separator className={cn(collapsed && "mx-2")} />

      {/* Bottom items */}
      <div className="px-2 py-1">
        {bottomItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const link = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px] font-medium bg-destructive/10 text-destructive">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }
          return link;
        })}
      </div>

      <Separator className={cn(collapsed && "mx-2")} />

      {/* User */}
      <div className={cn("flex items-center gap-2 p-3", collapsed && "justify-center p-2")}>
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">SM</AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-xs font-medium text-foreground">Shiva M.</span>
            <span className="truncate text-[10px] text-muted-foreground">Admin</span>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
