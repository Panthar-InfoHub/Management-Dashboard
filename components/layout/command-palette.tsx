"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, FolderKanban, Users, UserCircle, CalendarDays,
  FileText, BarChart3, Settings, ClipboardCheck, MessageSquare,
  Plus, Search, Zap, ArrowRight,
} from "lucide-react";

export function CommandPalette() {
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
          <CommandItem onSelect={() => navigate("/tasks")} className="gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" /> Create Task
          </CommandItem>
          <CommandItem onSelect={() => navigate("/projects")} className="gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" /> Create Project
          </CommandItem>
          <CommandItem onSelect={() => navigate("/daily-updates")} className="gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" /> Submit Daily Update
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/")} className="gap-2">
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> Dashboard
            <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground" />
          </CommandItem>
          <CommandItem onSelect={() => navigate("/projects")} className="gap-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" /> Projects
          </CommandItem>
          <CommandItem onSelect={() => navigate("/tasks")} className="gap-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" /> Tasks
          </CommandItem>
          <CommandItem onSelect={() => navigate("/teams")} className="gap-2">
            <Users className="h-4 w-4 text-muted-foreground" /> Teams
          </CommandItem>
          <CommandItem onSelect={() => navigate("/employees")} className="gap-2">
            <UserCircle className="h-4 w-4 text-muted-foreground" /> Employees
          </CommandItem>
          <CommandItem onSelect={() => navigate("/daily-updates")} className="gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" /> Daily Updates
          </CommandItem>
          <CommandItem onSelect={() => navigate("/calendar")} className="gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" /> Calendar
          </CommandItem>
          <CommandItem onSelect={() => navigate("/documents")} className="gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" /> Documents
          </CommandItem>
          <CommandItem onSelect={() => navigate("/reports")} className="gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" /> Reports
          </CommandItem>
          <CommandItem onSelect={() => navigate("/settings")} className="gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" /> Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
