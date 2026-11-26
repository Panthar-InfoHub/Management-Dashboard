"use client";
import { STATUS_META, StatusIcon } from "@/components/tasks/task-icons";
import type { TeamDetail, TeamRecentTask } from "@/lib/queries/team.queries";
import type { Jsonify } from "@/lib/types";
import type { Person } from "@/components/teams/team-dialogs";

import { ConfirmAction } from "@/components/ui/confirm-action";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ChevronRight, Users, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteTeamAction } from "@/lib/actions/team.actions";
import { EditTeamDialog, ManageMembersDialog } from "@/components/teams/team-dialogs";



export function TeamDetailClient({ team, allEmployees = [], tasks = [], canEdit = true, canDelete = false, stats = { open: 0, overdue: 0, doneWeek: 0 } }: { team: Jsonify<TeamDetail>, allEmployees?: Person[], tasks?: Jsonify<TeamRecentTask>[], canEdit?: boolean, canDelete?: boolean, stats?: { open: number; overdue: number; doneWeek: number } }) {
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const handleOpenEdit = () => setEditOpen(true);
  const handleOpenManage = () => setManageOpen(true);

  const handleDeleteTeam = async () => {
    await deleteTeamAction(team.id);
    router.push("/teams");
    return `Team ${team.name} deleted`;
  };

  return (
    <div className="h-full flex flex-col bg-background selection:bg-primary/10">
      {/* Vercel-like Breadcrumb & Actions Bar */}
      <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
          <Link href="/teams" className="hover:text-foreground transition-colors shrink-0">Teams</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground font-medium truncate">{team.name}</span>
        </div>
        {canEdit && (
          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleOpenManage} className="h-8 shadow-none gap-2 flex-1 sm:flex-initial">
              <Users className="h-4 w-4 shrink-0" /> <span className="truncate">Manage Members</span>
            </Button>
            <Button size="sm" variant="outline" onClick={handleOpenEdit} className="h-8 shadow-none gap-2 flex-1 sm:flex-initial">
              <Settings2 className="h-4 w-4 shrink-0" /> <span className="truncate">Edit Team</span>
            </Button>
            {canDelete && (
              <ConfirmAction
                trigger={<Button size="sm" variant="ghost" className="h-8 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400">Delete</Button>}
                title={`Delete team ${team.name}?`}
                description="This can't be undone."
                confirmLabel="Delete Team"
                pendingLabel="Deleting…"
                destructive
                onConfirm={handleDeleteTeam}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">{team.description || "No description yet."}</p>
          </div>

          {/* Headline numbers */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: "Members", value: team.members.length },
              { label: "Projects", value: team.projects.length },
              { label: "Open Tasks", value: stats.open, accent: true },
              { label: "Overdue", value: stats.overdue, critical: true },
              { label: "Done in 7 Days", value: stats.doneWeek },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)] p-4">
                <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                <p className={cn("mt-1 text-2xl font-semibold tabular-nums", k.critical && k.value > 0 && "text-red-600 dark:text-red-400")}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              {/* Projects */}
              <section className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
                <header className="flex items-center justify-between px-5 pt-4 pb-3">
                  <h2 className="text-sm font-semibold">Projects</h2>
                  <span className="text-xs text-muted-foreground">{team.projects.length}</span>
                </header>
                {team.projects.length > 0 ? (
                  <ul className="divide-y divide-border/60 border-t border-border/60">
                    {team.projects.map((project) => (
                      <li key={project.id}>
                        <Link href={`/projects/${project.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{project.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {project.key && <span className="font-mono">{project.key} · </span>}
                              {project.status.charAt(0) + project.status.slice(1).toLowerCase()} · {project.done}/{project.total} done
                            </p>
                          </div>
                          <div className="hidden w-40 items-center gap-2 sm:flex">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground/75" style={{ width: `${project.progress}%` }} /></div>
                            <span className="w-9 text-right text-xs font-medium tabular-nums">{project.progress}%</span>
                          </div>
                          {project.lead && <UserAvatar className="h-7 w-7" user={project.lead} textClassName="text-[9px]" />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">No projects yet. Create a project and choose this team.</p>
                )}
              </section>

              {/* Recent tasks */}
              <section className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
                <header className="flex items-center justify-between px-5 pt-4 pb-3">
                  <h2 className="text-sm font-semibold">Recently Updated Tasks</h2>
                  <Link href={`/tasks?team=${team.id}&view=list`} className="text-xs font-medium text-muted-foreground hover:text-foreground">All tasks →</Link>
                </header>
                {tasks.length > 0 ? (
                  <ul className="divide-y divide-border/60 border-t border-border/60">
                    {tasks.map((t) => {
                      const owner = t.owner ?? t.assignees?.[0];
                      return (
                        <li key={t.id}>
                          <Link href={`/tasks/${t.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none">
                            <StatusIcon status={t.status} className="h-3.5 w-3.5" />
                            <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{t.project?.key && t.number ? `${t.project.key}-${t.number}` : ""}</span>
                            <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                            <span className="hidden text-xs text-muted-foreground sm:block">{STATUS_META[t.status]?.label ?? t.status}</span>
                            {owner && <UserAvatar className="h-6 w-6" user={owner} textClassName="text-[9px]" />}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="border-t border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">No tasks in this team&apos;s projects yet.</p>
                )}
              </section>

              {/* Members */}
              <section className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
                <header className="flex items-center justify-between px-5 pt-4 pb-3">
                  <h2 className="text-sm font-semibold">Members</h2>
                  <span className="text-xs text-muted-foreground">{team.members.length}</span>
                </header>
                {team.members.length > 0 ? (
                  <ul className="divide-y divide-border/60 border-t border-border/60">
                    {team.members.map((member) => (
                      <li key={member.id}>
                        <Link href={`/employees/${member.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-2.5 hover:bg-muted/40 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
                          <span className="flex min-w-0 items-center gap-3">
                            <UserAvatar className="h-8 w-8" user={member} textClassName="text-xs" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{member.firstName} {member.lastName}</span>
                              {member.id === team.leadId && <span className="text-[11px] font-medium">Team Lead</span>}
                            </span>
                          </span>
                          <span className="hidden truncate text-sm text-muted-foreground sm:block">{member.designation || "—"}</span>
                          <span className="truncate text-right text-xs text-muted-foreground sm:text-left">{member.email}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="border-t border-border/60 px-5 py-8 text-center text-sm text-muted-foreground">No members yet.{canEdit ? " Use Manage Members to add people." : ""}</p>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <aside className="rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)] space-y-5 p-5 lg:sticky lg:top-6">
              <div>
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Team Lead</h3>
                {team.lead ? (
                  <div className="flex items-center gap-3">
                    <UserAvatar className="h-10 w-10" user={team.lead} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{team.lead.firstName} {team.lead.lastName}</p>
                      <p className="truncate text-xs text-muted-foreground">{team.lead.designation || team.lead.email}</p>
                    </div>
                  </div>
                ) : <p className="text-sm text-muted-foreground">No lead yet.</p>}
              </div>
              <dl className="space-y-2.5 border-t border-border/60 pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Created</dt><dd className="font-medium">{new Date(team.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Leads approve</dt><dd className="font-medium">Team leave</dd></div>
              </dl>
              <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
                <Button asChild variant="outline" size="sm"><Link href={`/attendance/team?team=${team.id}`}>Team Attendance</Link></Button>
                <Button asChild variant="outline" size="sm"><Link href={`/tasks?team=${team.id}`}>Team Board</Link></Button>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Mounted only while open, so each opening starts from the saved team. */}
      {editOpen && <EditTeamDialog team={team} people={allEmployees} open onOpenChange={setEditOpen} />}
      {manageOpen && <ManageMembersDialog team={team} people={allEmployees} open onOpenChange={setManageOpen} />}
    </div>
  );
}
