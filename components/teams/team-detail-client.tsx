"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, Edit, Users, Mail, LayoutDashboard, MoreVertical, CheckSquare, Settings2, Shield, CalendarIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateTeamAction, manageTeamMembersAction } from "@/lib/actions/team.actions";

const statusColors: Record<string, string> = { ACTIVE: "bg-blue-500/10 text-blue-600 border-blue-500/20", PLANNING: "bg-purple-500/10 text-purple-600 border-purple-500/20", PAUSED: "bg-orange-500/10 text-orange-600 border-orange-500/20", COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", ARCHIVED: "bg-gray-500/10 text-gray-600 border-gray-500/20" };

const taskStatusColors: Record<string, string> = { BACKLOG: "bg-gray-500/10 text-gray-600 border-gray-500/20", TODO: "bg-slate-500/10 text-slate-600 border-slate-500/20", IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20", REVIEW: "bg-purple-500/10 text-purple-600 border-purple-500/20", TESTING: "bg-orange-500/10 text-orange-600 border-orange-500/20", DONE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };

export function TeamDetailClient({ team, allEmployees = [], tasks = [] }: { team: any, allEmployees?: any[], tasks?: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Edit Team State
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ name: team.name, description: team.description || "", leadId: team.leadId || "" });

  const handleOpenEdit = () => {
    setEditData({ name: team.name, description: team.description || "", leadId: team.leadId || "" });
    setEditOpen(true);
  };

  // Manage Members State
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const handleOpenManage = () => {
    // Only pre-select members that are not the lead
    setSelectedMemberIds(team.members.filter((m: any) => m.id !== team.leadId).map((m: any) => m.id));
    setManageOpen(true);
  };

  const handleUpdateTeam = () => {
    if (!editData.name || !editData.leadId) return;
    startTransition(() => {
      updateTeamAction(team.id, editData).then(() => {
        setEditOpen(false);
        router.refresh();
      }).catch(err => console.error(err));
    });
  };

  const handleManageMembers = () => {
    startTransition(() => {
      // Ensure the lead is ALWAYS part of the team members
      const finalMemberIds = Array.from(new Set([...selectedMemberIds, team.leadId]));
      manageTeamMembersAction(team.id, finalMemberIds).then(() => {
        setManageOpen(false);
        router.refresh();
      }).catch(err => console.error(err));
    });
  };

  const toggleMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter(mid => mid !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background selection:bg-primary/10">
      {/* Vercel-like Breadcrumb & Actions Bar */}
      <div className="px-8 py-5 border-b border-border/40 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/teams" className="hover:text-foreground transition-colors">Teams</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate max-w-[300px]">{team.name}</span>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleOpenManage} className="h-8 shadow-none gap-2">
            <Users className="h-4 w-4" /> Manage Members
          </Button>
          <Button size="sm" onClick={handleOpenEdit} className="h-8 shadow-none gap-2">
            <Settings2 className="h-4 w-4" /> Edit Team
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_320px] gap-12 items-start">
          
          {/* Main Content Area */}
          <div className="space-y-10">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-muted/10">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">{team.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">Created {new Date(team.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                </div>
              </div>
              
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed mt-6">
                {team.description ? (
                  <p className="whitespace-pre-wrap text-[15px]">{team.description}</p>
                ) : (
                  <p className="italic">No description provided for this team.</p>
                )}
              </div>
            </div>

            {/* Tasks Section */}
            <div className="pt-8 border-t border-border/40">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" /> Recent Team Tasks
                </h3>
              </div>

              {tasks.length > 0 ? (
                <div className="border border-border/40 rounded-lg bg-background flex flex-col">
                  <div className="divide-y divide-border/40 overflow-y-auto max-h-[400px]">
                    {tasks.map((task: any) => (
                      <div key={task.id} className="p-4 hover:bg-muted/20 transition-colors flex items-center justify-between group">
                        <div className="space-y-1.5 min-w-0 flex-1 pr-4">
                          <Link href={`/tasks`} className="text-sm font-medium group-hover:text-primary transition-colors truncate block">
                            {task.title}
                          </Link>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 shadow-none rounded-sm uppercase tracking-wider", taskStatusColors[task.status])}>
                              {task.status.replace("_", " ")}
                            </Badge>
                            <span className="truncate">in {task.project?.name}</span>
                          </div>
                        </div>
                        <div className="flex -space-x-1.5 shrink-0">
                          {task.assignees?.map((a: any) => (
                            <Avatar key={a.id} className="h-6 w-6 border-2 border-background ring-1 ring-border/20">
                              <AvatarImage src={a.avatarUrl} />
                              <AvatarFallback className="text-[8px] bg-primary/10">{a.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/40 p-8 text-center bg-muted/10">
                  <p className="text-sm text-muted-foreground">No recent tasks for this team.</p>
                </div>
              )}
            </div>

            {/* Team Projects */}
            <div className="pt-8 border-t border-border/40">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> Active Projects
                </h3>
              </div>

              {team.projects.length > 0 ? (
                <div className="border border-border/40 rounded-lg bg-background flex flex-col">
                  <div className="divide-y divide-border/40 overflow-y-auto max-h-[400px]">
                    {team.projects.map((project: any) => (
                      <div key={project.id} className="p-4 hover:bg-muted/20 transition-colors flex items-center justify-between group">
                        <div className="space-y-1.5">
                          <Link href={`/projects/${project.id}`} className="text-sm font-medium group-hover:text-primary transition-colors block">
                            {project.name}
                          </Link>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 shadow-none rounded-sm", statusColors[project.status])}>
                              {project.status.replace("_", " ")}
                            </Badge>
                            <span className="flex items-center gap-1.5">
                              Progress: {project.progress}%
                            </span>
                          </div>
                        </div>
                        {project.lead && (
                          <Avatar className="h-7 w-7 border-2 border-background">
                            <AvatarImage src={project.lead.avatarUrl} />
                            <AvatarFallback className="text-[9px] bg-primary/10">{project.lead.firstName.charAt(0)}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/40 p-8 text-center bg-muted/10">
                  <p className="text-sm text-muted-foreground">No projects assigned to this team.</p>
                </div>
              )}
            </div>

            {/* Team Members */}
            <div className="pt-8 border-t border-border/40">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <Users className="h-4 w-4 text-muted-foreground" /> Team Members
                </h3>
                <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">{team.members.length} Members</span>
              </div>

              {team.members.length > 0 ? (
                <div className="border border-border/40 rounded-lg bg-background flex flex-col">
                  <div className="grid grid-cols-[2fr_1.5fr_1fr] gap-4 px-5 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20 border-b border-border/40">
                    <span>Member</span><span>Designation</span><span>Email</span>
                  </div>
                  <div className="divide-y divide-border/40 bg-muted/5 overflow-y-auto max-h-[400px]">
                    
                    {team.members.map((member: any) => (
                      <div key={member.id} className="grid grid-cols-[2fr_1.5fr_1fr] gap-4 px-5 py-3.5 items-center hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatarUrl} />
                            <AvatarFallback className="text-xs bg-primary/10">{member.firstName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{member.firstName} {member.lastName}</p>
                            {member.id === team.leadId && (
                              <Badge variant="secondary" className="text-[9px] mt-1 h-4 px-1.5 leading-none bg-primary/10 text-primary border-primary/20">Team Lead</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {member.designation || "—"}
                        </div>
                        <div className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                          <Mail className="h-3 w-3" /> {member.email}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/40 p-8 text-center bg-muted/10">
                  <p className="text-sm text-muted-foreground">No members assigned to this team.</p>
                </div>
              )}
            </div>

          </div>

          {/* Right Sidebar */}
          <div className="space-y-8">
            {/* Leadership Overview */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Leadership</h3>
              {team.lead ? (
                <div className="bg-muted/20 border border-border/40 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                      <AvatarImage src={team.lead.avatarUrl} />
                      <AvatarFallback className="bg-primary/10">{team.lead.firstName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{team.lead.firstName} {team.lead.lastName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{team.lead.designation || "Team Lead"}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2 text-xs text-muted-foreground truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{team.lead.email}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No team lead assigned.</p>
              )}
            </div>

            {/* Properties */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Properties</h3>
              <div className="space-y-4 bg-muted/10 p-4 rounded-lg border border-border/40">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><CheckSquare className="h-3.5 w-3.5" /> Tasks</span>
                  <span className="font-medium bg-background border border-border/50 px-2 py-0.5 rounded text-xs">{tasks.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><LayoutDashboard className="h-3.5 w-3.5" /> Projects</span>
                  <span className="font-medium bg-background border border-border/50 px-2 py-0.5 rounded text-xs">{team.projects.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Members</span>
                  <span className="font-medium bg-background border border-border/50 px-2 py-0.5 rounded text-xs">{team.members.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Team Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1.5 flex flex-col">
              <label className="text-xs font-semibold text-muted-foreground">Team Name</label>
              <Input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
            </div>
            <div className="space-y-1.5 flex flex-col">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Input value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} />
            </div>
            <div className="space-y-1.5 flex flex-col">
              <label className="text-xs font-semibold text-muted-foreground">Team Lead</label>
              <Select value={editData.leadId} onValueChange={val => setEditData({ ...editData, leadId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team lead" />
                </SelectTrigger>
                <SelectContent>
                  {allEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdateTeam} disabled={isPending || !editData.name || !editData.leadId} className="w-full mt-2">
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Members Modal */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Team Members</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-2 pr-2">
            {allEmployees.filter(emp => emp.id !== team.leadId).map(emp => {
              const isSelected = selectedMemberIds.includes(emp.id);
              
              return (
                <div 
                  key={emp.id} 
                  onClick={() => toggleMember(emp.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                    isSelected ? "border-primary/50 bg-primary/5" : "border-transparent hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-4 h-4 rounded-sm border shrink-0 transition-colors",
                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border/50 bg-background"
                  )}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={emp.avatarUrl} />
                    <AvatarFallback className="text-xs">{emp.firstName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{emp.designation || emp.email}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter className="pt-4 border-t border-border/40">
            <Button variant="outline" onClick={() => setManageOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleManageMembers} disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
