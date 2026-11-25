"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useAccess } from "@/hooks/use-access";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, FolderKanban, Users, UserCircle,
  FileText, Bell, Settings, ClipboardCheck, ListTodo, CalendarClock, Plane, Inbox, ScrollText, Megaphone,
  PanelLeftClose, PanelLeft,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: any; badge?: string };

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
  { label: "My Tasks", href: "/tasks/my", icon: ListTodo },
  { label: "Tasks", href: "/tasks", icon: ClipboardCheck },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Teams", href: "/teams", icon: Users },
  { label: "Members", href: "/employees", icon: UserCircle },
  { label: "Attendance", href: "/attendance", icon: CalendarClock },
  { label: "Leave", href: "/leave", icon: Plane },
  { label: "Approvals", href: "/approvals", icon: Inbox },
  { label: "Records", href: "/records", icon: FileText },
];

const bottomItems: NavItem[] = [
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Audit Log", href: "/audit", icon: ScrollText },
  { label: "Settings", href: "/settings", icon: Settings },
];

// A constrained divider that doesn't bleed out in collapsed mode
function Divider() {
  return <div className="my-2 h-px bg-border w-[calc(100%-16px)] mx-auto" />;
}

type NavListsProps = { collapsed: boolean; canViewRecords: boolean; canOpenSettings: boolean; canApprove: boolean; isAdmin: boolean; onNavigate?: () => void };

// usePathname() is request data on dynamic routes, so it lives in its own
// component behind <Suspense>. The fallback renders the same links without the
// active highlight, keeping the sidebar in the prerendered shell.
function ActiveNavLists(props: NavListsProps) {
  const pathname = usePathname();
  return <NavLists pathname={pathname} {...props} />;
}

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  // "Tasks" isn't also highlighted on its own "My Tasks" page.
  if (href === "/tasks" && pathname.startsWith("/tasks/my")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItemLink({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        collapsed && "justify-center px-0 h-9"
      )}
    >
      <item.icon className={cn("h-4 w-4 shrink-0", active && "text-foreground")} />
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

  if (!collapsed) return link;
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function NavLists({ pathname, collapsed, canViewRecords, canOpenSettings, canApprove, isAdmin, onNavigate }: NavListsProps & { pathname: string | null }) {
  return (
    <>
      <ScrollArea className="flex-1 px-2 py-1">
        <nav className="flex flex-col gap-0.5 mt-1">
          {navItems.filter((item) => (canViewRecords || item.label !== "Records") && (canApprove || item.label !== "Approvals")).map((item) => (
            <NavItemLink key={item.href} item={item} active={isActivePath(pathname, item.href)} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </nav>
      </ScrollArea>

      <Divider />

      <div className="px-2 py-1">
        {bottomItems.filter((item) => (canOpenSettings || item.label !== "Settings") && (isAdmin || item.label !== "Audit Log")).map((item) => (
          <NavItemLink key={item.href} item={item} active={isActivePath(pathname, item.href)} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
    </>
  );
}

export function Sidebar({ collapsed, setCollapsed, isMobile, onNavigate }: { collapsed: boolean; setCollapsed: (val: boolean) => void, isMobile?: boolean, onNavigate?: () => void }) {
  const { user, isLoaded } = useUser();
  const access = useAccess();
  const canViewRecords = access.can("employee:view-all");
  const canOpenSettings = access.isAdmin || access.can("leave:manage");
  const canApprove = access.can("leave:approve") || access.leadsTeam;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex-col border-r border-border bg-sidebar transition-all duration-200",
        isMobile ? "flex relative w-full" : "hidden md:flex",
        !isMobile && (collapsed ? "w-[60px]" : "w-[240px]")
      )}
    >
      {/* Header with Logo and Collapse Toggle */}
      <div className={cn("flex h-14 items-center border-b border-border px-3", collapsed ? "justify-center" : "justify-between")}>
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white">
            <img src="/images/black_logo.webp" alt="PantharInfoHub" className="h-6 w-6 object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold text-foreground">PantharInfoHub</span>
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

      <Suspense fallback={<NavLists pathname={null} collapsed={collapsed} canViewRecords={canViewRecords} canOpenSettings={canOpenSettings} canApprove={canApprove} isAdmin={access.isAdmin} onNavigate={onNavigate} />}>
        <ActiveNavLists collapsed={collapsed} canViewRecords={canViewRecords} canOpenSettings={canOpenSettings} canApprove={canApprove} isAdmin={access.isAdmin} onNavigate={onNavigate} />
      </Suspense>

      <Divider />

      {/* User */}
      <div className={cn("flex items-center gap-2 p-3", collapsed && "justify-center p-2 mb-2")}>
        {!isLoaded ? (
          <>
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            {!collapsed && (
              <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            )}
          </>
        ) : (
          <>
            <UserAvatar className="h-8 w-8" user={{ name: user?.fullName || user?.firstName || "", avatarUrl: user?.hasImage ? user.imageUrl : null }} />
            {!collapsed && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-xs font-medium text-foreground">{user?.fullName || "User"}</span>
                <span className="truncate text-[10px] text-muted-foreground">{user?.primaryEmailAddress?.emailAddress || "user@panthar.io"}</span>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
