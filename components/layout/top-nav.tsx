"use client";
import type { Notification } from "@/lib/generated/prisma";

import { useTheme } from "@/components/providers/theme-provider";
import { UserButton, ClerkLoading, ClerkLoaded } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Bell, ChevronRight, Moon, Sun, Monitor,
  Menu, CheckCheck
} from "lucide-react";
import { Suspense, useEffect, useState, useTransition, useSyncExternalStore } from "react";
import { getRecentNotificationsAction, markAllNotificationsAsReadAction } from "@/lib/actions/notification.actions";
import { formatDistanceToNow } from "date-fns";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

const SECTIONS: Record<string, string> = {
  "": "Dashboard", tasks: "Tasks", projects: "Projects", teams: "Teams", employees: "Members", attendance: "Attendance",
  leave: "Leave", calendar: "Calendar", updates: "Daily Updates", approvals: "Approvals", announcements: "Announcements", records: "Employment Records", audit: "Audit Log",
  settings: "Settings", notifications: "Notifications",
};
const SUBPAGES: Record<string, string> = { my: "My Tasks", new: "New", edit: "Edit", team: "Team Month", today: "Team Day" };

/** "Projects › Details" style location from the URL. */
function crumbsFor(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = [{ href: `/${parts[0] ?? ""}`, label: SECTIONS[parts[0] ?? ""] ?? "Dashboard" }];
  let href = `/${parts[0] ?? ""}`;
  for (const part of parts.slice(1)) {
    href += `/${part}`;
    crumbs.push({ href, label: SUBPAGES[part] ?? "Details" });
  }
  return crumbs;
}

/** Reads the URL, so it sits in its own Suspense boundary. */
function Crumbs() {
  const crumbs = crumbsFor(usePathname() ?? "/");
  return (
      <nav aria-label="Location" className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
        <span className="hidden font-medium text-foreground sm:inline">Panthar</span>
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex min-w-0 items-center gap-1">
            <ChevronRight className={cn("h-3.5 w-3.5 shrink-0", i === 0 && "hidden sm:inline")} />
            {i < crumbs.length - 1 ? (
              <Link href={c.href} className="truncate hover:text-foreground">{c.label}</Link>
            ) : (
              <span className="truncate font-medium text-foreground" aria-current="page">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
  );
}

const noop = () => () => {};

export function TopNav({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (open: boolean) => void }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPending, startTransition] = useTransition();
  // False during the server render and hydration, true after: avoids a theme-icon mismatch.
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await getRecentNotificationsAction();
        setNotifications(data);
      } catch {
        // The bell just stays empty if notifications can't load.
      }
    };
    fetchNotifs();
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/80 px-3 backdrop-blur-md sm:px-6">
      {/* Mobile Menu & Breadcrumb */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-1 text-muted-foreground md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r border-border">
            <Sidebar collapsed={false} setCollapsed={() => setMenuOpen(false)} isMobile={true} onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        
        <Suspense fallback={<span className="text-sm font-medium">Panthar</span>}>
          <Crumbs />
        </Suspense>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))]">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-sm font-semibold">Notifications</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{unreadCount} new</Badge>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    disabled={isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      startTransition(() => {
                        markAllNotificationsAsReadAction().then(() => {
                          setNotifications(notifications.map(n => ({ ...n, isRead: true })));
                        });
                      });
                    }}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 px-3 py-2 cursor-pointer" onClick={() => router.push(n.actionUrl || "/notifications")}>
                  <div className="flex w-full items-center gap-2">
                    <span className={`text-xs font-medium ${n.isRead ? "text-muted-foreground" : "text-foreground"}`}>{n.title}</span>
                    {!n.isRead && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />}
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate w-full">{n.message}</span>
                  <span className="text-[10px] text-muted-foreground/60">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center text-xs text-muted-foreground cursor-pointer">
              <Link href="/notifications">View All Notifications</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              {mounted && theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2"><Sun className="h-3.5 w-3.5" /> Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2"><Moon className="h-3.5 w-3.5" /> Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2"><Monitor className="h-3.5 w-3.5" /> System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>



        {/* User menu (Clerk) */}
        <div className="flex items-center pl-2 h-8 w-8 justify-center ml-1">
          <ClerkLoading>
            <div key="clerk-loading-state">
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
          </ClerkLoading>
          <ClerkLoaded>
            <div key="clerk-loaded-state">
              <UserButton />
            </div>
          </ClerkLoaded>
        </div>
      </div>
    </header>
  );
}
