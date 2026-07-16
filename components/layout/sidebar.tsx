"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, FolderKanban, Users, UserCircle, CalendarDays,
  FileText, Bell, BarChart3, Settings, Zap, ClipboardCheck, Search, MessageSquare, 
  PanelLeftClose, PanelLeft,
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

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (val: boolean) => void }) {
  const pathname = usePathname();
  const { user } = useUser();

  // A constrained divider that doesn't bleed out in collapsed mode
  const Divider = () => <div className="my-2 h-px bg-border w-[calc(100%-16px)] mx-auto" />;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {/* Header with Logo and Collapse Toggle */}
      <div className={cn("flex h-14 items-center border-b border-border px-3", collapsed ? "justify-center" : "justify-between")}>
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold text-foreground">Panthar</span>
            </div>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("h-7 w-7 text-muted-foreground hover:bg-accent shrink-0", collapsed && "hidden")}
          onClick={() => setCollapsed(true)}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center pt-3 pb-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:bg-accent" 
            onClick={() => setCollapsed(false)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-3">
          <button 
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search…</span>
            <kbd className="ml-auto rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Nav */}
      <ScrollArea className="flex-1 px-2 py-1">
        <nav className="flex flex-col gap-0.5 mt-1">
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
                  collapsed && "justify-center px-0 h-9"
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

      <Divider />

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
                collapsed && "justify-center px-0 h-9"
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

      <Divider />

      {/* User */}
      <div className={cn("flex items-center gap-2 p-3", collapsed && "justify-center p-2 mb-2")}>
        <Avatar className="h-8 w-8 rounded-md">
          {user?.imageUrl ? (
            <AvatarImage src={user.imageUrl} alt={user.fullName ?? ""} />
          ) : (
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary rounded-md border border-primary/20">
              {user?.firstName?.charAt(0) || "U"}
            </AvatarFallback>
          )}
        </Avatar>
        {!collapsed && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-xs font-medium text-foreground">{user?.fullName || "User"}</span>
            <span className="truncate text-[10px] text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || "user@panthar.io"}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
