"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Bell, ChevronRight, Moon, Sun, Monitor, Plus,
  Search, Command,
} from "lucide-react";
import { notifications } from "@/lib/mock-data";

export function TopNav() {
  const { theme, setTheme } = useTheme();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Panthar</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>Dashboard</span>
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Search */}
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Search className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">Search</span>
          <kbd className="hidden rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
        </Button>

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Quick action */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Plus className="h-4 w-4" />
        </Button>

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

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 px-1.5">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">SM</AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-medium sm:inline">Shiva</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">Shiva M.</p>
              <p className="text-xs text-muted-foreground">shiva@panthar.io</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Keyboard Shortcuts</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
