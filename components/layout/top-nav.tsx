"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { UserButton, Show } from "@clerk/nextjs";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Bell, ChevronRight, Moon, Sun, Monitor, Plus,
  Search, Command, Menu,
} from "lucide-react";
import { notifications } from "@/lib/mock-data";
import { Sidebar } from "./sidebar";

export function TopNav() {
  const { theme, setTheme } = useTheme();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6">
      {/* Mobile Menu & Breadcrumb */}
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-muted-foreground">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r border-border">
            <Sidebar collapsed={false} setCollapsed={() => {}} isMobile={true} />
          </SheetContent>
        </Sheet>
        
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground hidden sm:inline">Panthar</span>
          <ChevronRight className="h-3.5 w-3.5 hidden sm:inline" />
          <span>Dashboard</span>
        </nav>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Search */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 text-muted-foreground"
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
        >
          <Search className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">Search</span>
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5" />



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
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-sm font-semibold">Notifications</p>
              <Badge variant="secondary" className="text-[10px]">{unreadCount} new</Badge>
            </div>
            <DropdownMenuSeparator />
            {notifications.slice(0, 5).map((n) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 px-3 py-2">
                <div className="flex w-full items-center gap-2">
                  <span className={`text-xs font-medium ${n.read ? "text-muted-foreground" : "text-foreground"}`}>{n.title}</span>
                  {!n.read && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />}
                </div>
                <span className="text-[11px] text-muted-foreground">{n.description}</span>
                <span className="text-[10px] text-muted-foreground/60">{n.time}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-xs text-muted-foreground">
              View All Notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2"><Sun className="h-3.5 w-3.5" /> Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2"><Moon className="h-3.5 w-3.5" /> Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2"><Monitor className="h-3.5 w-3.5" /> System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>



        {/* User menu (Clerk) */}
        <div className="flex items-center pl-2">
          <Show 
            when="signed-in" 
            fallback={
              <Button asChild variant="default" size="sm">
                <Link href="/sign-in">Sign In</Link>
              </Button>
            }
          >
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
