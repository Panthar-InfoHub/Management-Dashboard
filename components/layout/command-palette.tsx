"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard, FolderKanban, Users, UserCircle, CalendarDays,
  FileText, BarChart3, Settings, ClipboardCheck, MessageSquare,
  Plus, Search, Zap, ArrowRight,
} from "lucide-react";

export function CommandPalette({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => navigate("/tasks")} className="gap-2 px-4 py-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span>Create Task</span>
            <CommandShortcut>⌘ T</CommandShortcut>
          </CommandItem>
          {isAdmin && (
            <CommandItem onSelect={() => navigate("/projects")} className="gap-2 px-4 py-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span>Create Project</span>
              <CommandShortcut>⌘ P</CommandShortcut>
            </CommandItem>
          )}
          <CommandItem 
            onSelect={() => {
              setOpen(false);
              document.dispatchEvent(new CustomEvent("open-submit-update"));
            }} 
            className="gap-2 px-4 py-2"
          >
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span>Submit Daily Update</span>
            <CommandShortcut>⌘ U</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/")} className="gap-2 px-4 py-2">
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/projects")} className="gap-2 px-4 py-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            <span>Projects</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/tasks")} className="gap-2 px-4 py-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            <span>Tasks</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/teams")} className="gap-2 px-4 py-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Teams</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/employees")} className="gap-2 px-4 py-2">
            <UserCircle className="h-4 w-4 text-muted-foreground" />
            <span>Members</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/daily-updates")} className="gap-2 px-4 py-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span>Daily Updates</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/calendar")} className="gap-2 px-4 py-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span>Calendar</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/documents")} className="gap-2 px-4 py-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>Documents</span>
          </CommandItem>
          {isAdmin && (
            <>
              <CommandItem onSelect={() => navigate("/reports")} className="gap-2 px-4 py-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span>Reports</span>
              </CommandItem>
              <CommandItem onSelect={() => navigate("/settings")} className="gap-2 px-4 py-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Settings</span>
                <CommandShortcut>⌘ ,</CommandShortcut>
              </CommandItem>
            </>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
