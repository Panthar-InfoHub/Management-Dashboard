import Link from "next/link";
import { FolderKanban, ListTodo, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const toneText: Record<string, string> = {
  default: "text-foreground",
  alert: "text-red-600 dark:text-red-400",
  success: "text-emerald-600 dark:text-emerald-400",
};

function Stat({ label, value, tone = "default" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className={cn("text-sm font-medium tabular-nums", toneText[tone])}>{value}</p>
    </div>
  );
}

function Block({
  href,
  icon: Icon,
  iconClassName,
  label,
  primary,
  primaryTone = "default",
  children,
}: {
  href: string;
  icon: React.ElementType;
  iconClassName: string;
  label: string;
  primary: number;
  primaryTone?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-border/40 bg-background transition-all hover:border-border"
    >
      <div className="flex items-center gap-4 border-b border-border/40 bg-muted/10 p-5">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background", iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", toneText[primaryTone])}>{primary}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 p-5">{children}</div>
    </Link>
  );
}

interface AdminOverview {
  isAdmin: true;
  projects: { active: number; planning: number; completed: number };
  tasks: { open: number; overdue: number; completedThisWeek: number };
  people: { members: number; teams: number; interns: number };
}

interface EmployeeOverview {
  isAdmin: false;
  tasks: { open: number; dueThisWeek: number; overdue: number };
  completed: { thisMonth: number; thisWeek: number };
  projects: { active: number; leading: number; designation: string };
}

export function OverviewBlocks({ overview }: { overview: AdminOverview | EmployeeOverview }) {
  if (overview.isAdmin) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Block href="/projects" icon={FolderKanban} iconClassName="text-blue-500" label="Active Projects" primary={overview.projects.active}>
          <Stat label="Planning" value={overview.projects.planning} />
          <Stat label="Completed" value={overview.projects.completed} />
        </Block>
        <Block href="/tasks" icon={ListTodo} iconClassName="text-purple-500" label="Open Tasks" primary={overview.tasks.open}>
          <Stat label="Overdue" value={overview.tasks.overdue} tone={overview.tasks.overdue > 0 ? "alert" : "default"} />
          <Stat label="Done This Week" value={overview.tasks.completedThisWeek} tone="success" />
        </Block>
        <Block href="/employees" icon={Users} iconClassName="text-emerald-500" label="Team Members" primary={overview.people.members}>
          <Stat label="Teams" value={overview.people.teams} />
          <Stat label="Interns" value={overview.people.interns} />
        </Block>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Block href="/tasks" icon={ListTodo} iconClassName="text-blue-500" label="My Open Tasks" primary={overview.tasks.open}>
        <Stat label="Due This Week" value={overview.tasks.dueThisWeek} />
        <Stat label="Overdue" value={overview.tasks.overdue} tone={overview.tasks.overdue > 0 ? "alert" : "default"} />
      </Block>
      <Block href="/tasks" icon={ListTodo} iconClassName="text-emerald-500" label="Completed This Month" primary={overview.completed.thisMonth} primaryTone="success">
        <Stat label="This Week" value={overview.completed.thisWeek} tone="success" />
        <Stat label="Status" value="On track" />
      </Block>
      <Block href="/projects" icon={FolderKanban} iconClassName="text-purple-500" label="My Projects" primary={overview.projects.active}>
        <Stat label="Leading" value={overview.projects.leading} />
        <Stat label="Role" value={overview.projects.designation} />
      </Block>
    </div>
  );
}
