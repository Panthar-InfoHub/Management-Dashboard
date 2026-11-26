"use client";
import type { getProjectsList } from "@/lib/queries/project.queries";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/panel";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

type Project = Awaited<ReturnType<typeof getProjectsList>>[number];

const STATUS_TABS = [
  { id: "OPEN", label: "In Flight" },
  { id: "ACTIVE", label: "Active" },
  { id: "PLANNING", label: "Planning" },
  { id: "PAUSED", label: "Paused" },
  { id: "COMPLETED", label: "Completed" },
  { id: "ALL", label: "All" },
] as const;
const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", PLANNING: "Planning", PAUSED: "Paused", COMPLETED: "Completed", ARCHIVED: "Archived" };
const STATUS_DOT: Record<string, string> = { ACTIVE: "bg-blue-600", PLANNING: "bg-purple-500", PAUSED: "bg-amber-500", COMPLETED: "bg-emerald-500", ARCHIVED: "bg-neutral-400" };
const PRIORITY_LABEL: Record<string, string> = { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
const PRIORITY_DOT: Record<string, string> = { CRITICAL: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-transparent", LOW: "bg-transparent" };

const fmt = (d: string | Date) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function deadlineOf(p: Project) {
  if (!p.endDate) return { text: "No deadline", tone: "muted" as const };
  const end = new Date(p.endDate);
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  // A project with nothing left to do isn't late, whatever its date says.
  const closed = ["COMPLETED", "ARCHIVED"].includes(p.status) || (p.totalTasks > 0 && p.openTasks === 0);
  if (!closed && days < 0) return { text: `${Math.abs(days)}d past ${fmt(end)}`, tone: "critical" as const };
  if (!closed && days <= 7) return { text: days === 0 ? "Due today" : `Due in ${days}d`, tone: "warning" as const };
  return { text: `Due ${fmt(end)}`, tone: "muted" as const };
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2 py-0.5 text-[11px] font-medium">
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />{STATUS_LABEL[status] ?? status}
    </span>
  );
}

function ProjectCard({ p, editable }: { p: Project; editable: boolean }) {
  const router = useRouter();
  const deadline = deadlineOf(p);
  const members = (p.members ?? []).map((m) => m.employee);
  return (
    <article
      onClick={() => router.push(`/projects/${p.id}`)}
      onMouseEnter={() => router.prefetch(`/projects/${p.id}`)}
      className="group flex cursor-pointer flex-col rounded-xl border border-border/70 bg-card p-5 shadow-[0_2px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-foreground/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            {p.key && <span className="font-mono">{p.key}</span>}
            {p.team?.name && <span className="truncate">· {p.team.name}</span>}
          </div>
          <Link href={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()} className="block truncate text-base font-semibold tracking-tight hover:underline focus-visible:underline focus-visible:outline-none">
            {p.name}
          </Link>
        </div>
        {editable && (
          <Button asChild variant="ghost" size="sm" className="-mr-2 h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
            <Link href={`/projects/${p.id}?edit=1`} aria-label={`Edit ${p.name}`}><Pencil className="h-3.5 w-3.5" /> Edit</Link>
          </Button>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 min-h-10 text-sm text-muted-foreground">{p.description || "No description yet."}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusPill status={p.status} />
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[p.priority])} />{PRIORITY_LABEL[p.priority]}</span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">{p.completedTasks}/{p.totalTasks} tasks done</span>
          <span className="font-semibold tabular-nums">{p.computedProgress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground/75" style={{ width: `${p.computedProgress}%` }} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs">
        <span className={cn(deadline.tone === "critical" && "font-medium text-red-600 dark:text-red-400", deadline.tone === "warning" && "font-medium text-amber-700 dark:text-amber-400", deadline.tone === "muted" && "text-muted-foreground")}>
          {deadline.text}
          {p.overdueTasks > 0 && <span className="text-red-600 dark:text-red-400"> · {p.overdueTasks} overdue</span>}
        </span>
        <div className="flex items-center -space-x-1.5">
          {p.lead && <UserAvatar className="h-6 w-6 ring-2 ring-card" user={p.lead} textClassName="text-[8px]" title={`Lead: ${p.lead.firstName} ${p.lead.lastName}`} />}
          {members.filter((m) => m.id !== p.lead?.id).slice(0, 3).map((m) => <UserAvatar key={m.id} className="h-6 w-6 ring-2 ring-card" user={m} textClassName="text-[8px]" />)}
          {members.length > 4 && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-medium ring-2 ring-card">+{members.length - 4}</span>}
        </div>
      </div>
    </article>
  );
}

export function ProjectsClient({ initialProjects, canCreate, editableIds = [] }: { initialProjects: Project[]; canCreate: boolean; editableIds?: string[] }) {
  const router = useRouter();
  const editable = new Set(editableIds);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["id"]>("OPEN");
  const [priority, setPriority] = useState("ALL");
  const [view, setView] = useState<"cards" | "list">("cards");

  const countFor = (id: string) => initialProjects.filter((p) => (id === "ALL" ? true : id === "OPEN" ? ["ACTIVE", "PLANNING"].includes(p.status) : p.status === id)).length;
  const projects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialProjects.filter((p) => {
      const inTab = tab === "ALL" || (tab === "OPEN" ? ["ACTIVE", "PLANNING"].includes(p.status) : p.status === tab);
      const matches = !q || `${p.name} ${p.key ?? ""} ${p.description ?? ""} ${p.team?.name ?? ""} ${p.lead?.firstName ?? ""} ${p.lead?.lastName ?? ""}`.toLowerCase().includes(q);
      return inTab && matches && (priority === "ALL" || p.priority === priority);
    });
  }, [initialProjects, query, tab, priority]);
  const atRisk = initialProjects.filter((p) => !["COMPLETED", "ARCHIVED"].includes(p.status) && (p.overdueTasks > 0 || deadlineOf(p).tone === "critical")).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        description={`${countFor("OPEN")} in flight${atRisk ? ` · ${atRisk} need attention` : ""} · ${initialProjects.length} total`}
        actions={canCreate ? <Button asChild size="sm" className="gap-1.5"><Link href="/projects/new"><Plus className="h-3.5 w-3.5" /> New Project</Link></Button> : undefined}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Status" className="flex gap-1 overflow-x-auto">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn("shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none", tab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
            >
              {t.label} <span className="ml-0.5 tabular-nums opacity-70">{countFor(t.id)}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full lg:w-64">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects…" className="pl-8" aria-label="Search projects" />
          </div>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-36" aria-label="Priority"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any Priority</SelectItem>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="View">
            {([["cards", LayoutGrid], ["list", List]] as const).map(([v, Icon]) => (
              <button key={v} role="radio" aria-checked={view === v} aria-label={v === "cards" ? "Cards" : "List"} onClick={() => setView(v)} className={cn("rounded-md p-1.5 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none", view === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium">{initialProjects.length === 0 ? "No projects yet" : "No projects match"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{initialProjects.length === 0 ? (canCreate ? "Create a project to start planning work." : "You'll see projects here once you're added to one.") : "Try another status or search."}</p>
        </div>
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => <ProjectCard key={p.id} p={p} editable={editable.has(p.id)} />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="text-[11px] uppercase tracking-wider">
                <TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead>Progress</TableHead><TableHead>Open</TableHead><TableHead>Deadline</TableHead><TableHead>Lead</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => {
                const d = deadlineOf(p);
                return (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
                    <TableCell>
                      <Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                      <p className="text-xs text-muted-foreground">{p.key && <span className="font-mono">{p.key} · </span>}{p.team?.name}</p>
                    </TableCell>
                    <TableCell><StatusPill status={p.status} /></TableCell>
                    <TableCell>
                      <div className="flex w-32 items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground/75" style={{ width: `${p.computedProgress}%` }} /></div>
                        <span className="w-9 text-right text-xs tabular-nums">{p.computedProgress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{p.openTasks}{p.overdueTasks > 0 && <span className="text-red-600 dark:text-red-400"> · {p.overdueTasks} late</span>}</TableCell>
                    <TableCell className={cn("text-xs", d.tone === "critical" ? "text-red-600 dark:text-red-400" : d.tone === "warning" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>{d.text}</TableCell>
                    <TableCell>{p.lead && <span className="flex items-center gap-2 text-sm"><UserAvatar className="h-6 w-6" user={p.lead} textClassName="text-[8px]" />{p.lead.firstName}</span>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
