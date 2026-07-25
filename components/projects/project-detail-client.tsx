"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, CheckSquare, Clock, ChevronRight, ChevronDown, Plus, Users, Flag, TrendingUp, Settings2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProjectAction, manageProjectMembersAction, updateProjectStatusAction, updateProjectPriorityAction, deleteProjectAction } from "@/lib/actions/project.actions";

import { MemberPermissionsDialog } from "./member-permissions-dialog";

const statusColors: Record<string, string> = { ACTIVE: "bg-blue-500/10 text-blue-600 border-blue-500/20", PLANNING: "bg-purple-500/10 text-purple-600 border-purple-500/20", PAUSED: "bg-orange-500/10 text-orange-600 border-orange-500/20", COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", ARCHIVED: "bg-gray-500/10 text-gray-600 border-gray-500/20" };
const priorityColors: Record<string, string> = { CRITICAL: "bg-red-500/10 text-red-600 border-red-500/20", HIGH: "bg-orange-500/10 text-orange-600 border-orange-500/20", MEDIUM: "bg-blue-500/10 text-blue-600 border-blue-500/20", LOW: "bg-gray-500/10 text-gray-600 border-gray-500/20" };
const taskStatusColors: Record<string, string> = { BACKLOG: "bg-gray-500/10 text-gray-600 border-gray-500/20", TODO: "bg-slate-500/10 text-slate-600 border-slate-500/20", IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20", REVIEW: "bg-purple-500/10 text-purple-600 border-purple-500/20", TESTING: "bg-amber-500/10 text-amber-600 border-amber-500/20", DONE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };

export function ProjectDetailClient({ project, allEmployees = [], allTeams = [], canEdit = true, canDelete = false, canDelegate = false }: { project: any, allEmployees: any[], allTeams: any[], canEdit?: boolean, canDelete?: boolean, canDelegate?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const completedTasks = project.tasks.filter((t: any) => t.status === "DONE").length;
  const totalTasks = project.tasks.length;
  
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  const toggleTask = (taskId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const tasksByParent = project.tasks.reduce((acc: any, t: any) => {
    if (t.parentId) {
      if (!acc[t.parentId]) acc[t.parentId] = [];
      acc[t.parentId].push(t);
    }
    return acc;
  }, {});

  const topLevelTasks = project.tasks.filter((t: any) => !t.parentId);
  
  // Edit Project State
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ 
    name: project.name, 
    description: project.description || "", 
    leadId: project.leadId,
    teamId: project.teamId,
    status: project.status,
    priority: project.priority
  });

  const handleOpenEdit = () => {
    setEditData({ 
      name: project.name, 
      description: project.description || "", 
      leadId: project.leadId,
      teamId: project.teamId,
      status: project.status,
      priority: project.priority
    });
    setEditOpen(true);
  };

  const handleUpdateProject = () => {
    if (!editData.name || !editData.leadId || !editData.teamId) return;
    startTransition(() => {
      updateProjectAction(project.id, editData).then(() => {
        setEditOpen(false);
        router.refresh();
      }).catch((err: any) => toast.error(err.message || "Failed to update project"));
    });
  };

  // Permission Delegation State
  const [permOpen, setPermOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const handleOpenPermissions = (member: any) => {
    setSelectedMember(member);
    setPermOpen(true);
  };

  // Manage Members State
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const handleOpenManage = () => {
    // Only pre-select members that are not the lead
    setSelectedMemberIds(project.members.filter((m: any) => m.employeeId !== project.leadId).map((m: any) => m.employeeId));
    setManageOpen(true);
  };

  const handleManageMembers = () => {
    startTransition(() => {
      // Ensure the lead is ALWAYS part of the project members
      const finalMemberIds = Array.from(new Set([...selectedMemberIds, project.leadId]));
      manageProjectMembersAction(project.id, finalMemberIds).then(() => {
        setManageOpen(false);
        router.refresh();
      }).catch((err: any) => toast.error(err.message || "Failed to manage members"));
    });
  };

  const toggleMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter(mid => mid !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleQuickStatusChange = (newStatus: string) => {
    if (newStatus === project.status) return;
    startTransition(() => {
      updateProjectStatusAction(project.id, newStatus).catch((err: any) => toast.error(err.message || "Failed to update status"));
    });
  };

  const handleQuickPriorityChange = (newPriority: string) => {
    if (newPriority === project.priority) return;
    startTransition(() => {
      updateProjectPriorityAction(project.id, newPriority).catch((err: any) => toast.error(err.message || "Failed to update priority"));
    });
  };

  const handleDeleteProject = () => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone and will delete all associated tasks.")) return;
    startTransition(() => {
      deleteProjectAction(project.id).then(() => {
        toast.success("Project deleted successfully");
        router.push("/projects");
      }).catch((err: any) => toast.error(err.message || "Failed to delete project"));
    });
  };

  return (
    <div className="h-full flex flex-col bg-background selection:bg-primary/10">
      {/* Vercel-like Breadcrumb & Actions Bar */}
      <div className="px-6 py-5 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
          <Link href="/projects" className="hover:text-foreground transition-colors shrink-0">Projects</Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground font-medium truncate">{project.name}</span>
        </div>
        {canEdit && (
          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleOpenManage} className="h-8 shadow-none gap-2 flex-1 sm:flex-initial">
              <Users className="h-4 w-4 shrink-0" /> <span className="truncate">Manage Members</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenEdit} className="h-8 shadow-none gap-2 flex-1 sm:flex-initial">
              <Settings2 className="h-4 w-4 shrink-0" /> <span className="truncate">Edit Project</span>
            </Button>
            <Button size="sm" asChild className="h-8 shadow-none gap-1.5 flex-1 sm:flex-initial">
              <Link href={`/tasks/new?project=${project.id}`}>
                <Plus className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Add Task</span>
              </Link>
            </Button>
            {canDelete && (
              <Button size="sm" variant="destructive" onClick={handleDeleteProject} className="h-8 shadow-none">
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_300px] gap-12 items-start">
          
          {/* Main Content Area */}
          <div className="space-y-10">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-4">{project.name}</h1>
              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  Status:
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge variant="outline" className={cn("px-2 py-0.5 rounded-full shadow-none cursor-pointer hover:opacity-80 transition-opacity", statusColors[project.status])}>
                        {project.status.replace("_", " ")} <ChevronDown className="h-3 w-3 ml-1 inline" />
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {Object.keys(statusColors).map(status => (
                        <DropdownMenuItem key={status} onClick={() => handleQuickStatusChange(status)} className="text-xs">
                          {status.replace("_", " ")}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  Priority:
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge variant="outline" className={cn("px-2 py-0.5 rounded-full shadow-none cursor-pointer hover:opacity-80 transition-opacity", priorityColors[project.priority])}>
                        {project.priority} <ChevronDown className="h-3 w-3 ml-1 inline" />
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {Object.keys(priorityColors).map(priority => (
                        <DropdownMenuItem key={priority} onClick={() => handleQuickPriorityChange(priority)} className="text-xs">
                          {priority}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                {project.description ? (
                  <p className="whitespace-pre-wrap text-[15px]">{project.description}</p>
                ) : (
                  <p className="italic">No description provided.</p>
                )}
              </div>
            </div>

            {/* Progress Section */}
            <div className="pt-8 border-t border-border/40">
              <h3 className="text-sm font-medium flex items-center gap-2 mb-4 text-foreground">
                <TrendingUp className="h-4 w-4 text-muted-foreground" /> Overall Progress
              </h3>
              <div className="bg-muted/20 border border-border/40 rounded-xl p-5">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <span className="text-3xl font-bold tracking-tight">{project.computedProgress}%</span>
                    <p className="text-xs text-muted-foreground mt-1">{completedTasks} of {totalTasks} tasks completed</p>
                  </div>
                </div>
                <Progress value={project.computedProgress} className="h-2 bg-muted-foreground/10" />
              </div>
            </div>

            {/* Tasks Section */}
            <div className="pt-8 border-t border-border/40">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" /> Project Tasks
                </h3>
                <Link href={`/tasks?project=${project.id}`} className="text-xs text-primary hover:underline">View All on Board</Link>
              </div>

              {project.tasks.length > 0 ? (
                <div className="border border-border/40 rounded-lg bg-background flex flex-col">
                  <div className="divide-y divide-border/40 overflow-y-auto max-h-[400px]">
                    {(() => {
                      const renderTree = (tasks: any[], depth = 0) => {
                        return tasks.map(task => {
                          const children = tasksByParent[task.id] || [];
                          const isExpanded = expandedTasks[task.id];
                          const hasChildren = children.length > 0;
                          
                          return (
                            <div key={task.id} className="flex flex-col border-b border-border/20 last:border-0">
                              <div 
                                className="p-4 hover:bg-muted/20 transition-colors flex items-center justify-between group cursor-pointer"
                                style={{ paddingLeft: `${Math.max(1, depth * 1.5) + 0.5}rem` }}
                                onClick={(e) => {
                                  if (hasChildren) {
                                    toggleTask(task.id, e);
                                  } else {
                                    router.push(`/tasks/${task.id}`);
                                  }
                                }}
                              >
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {hasChildren && (
                                      <div 
                                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted shrink-0 text-muted-foreground transition-colors"
                                      >
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </div>
                                    )}
                                    {!hasChildren && depth > 0 && <div className="h-5 w-5 shrink-0" />}
                                    <Link href={`/tasks/${task.id}`} className="text-sm font-medium group-hover:text-primary transition-colors block truncate" onClick={e => e.stopPropagation()}>
                                      {task.title}
                                    </Link>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground pl-7">
                                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 shadow-none rounded-sm", taskStatusColors[task.status])}>
                                      {task.status.replace("_", " ")}
                                    </Badge>
                                    {task.dueDate && (
                                      <span className="flex items-center gap-1.5">
                                        <Clock className="h-3 w-3" />
                                        {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex -space-x-2 shrink-0">
                                  {task.assignees?.map((a: any) => (
                                    <Avatar key={a.id} className="h-7 w-7 border-2 border-background">
                                      <AvatarImage src={a.avatarUrl} />
                                      <AvatarFallback className="text-[9px] bg-primary/10">{a.firstName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                              </div>
                              {hasChildren && isExpanded && (
                                <div className="flex flex-col w-full bg-muted/5">
                                  {renderTree(children, depth + 1)}
                                </div>
                              )}
                            </div>
                          );
                        });
                      };
                      return renderTree(topLevelTasks);
                    })()}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/40 p-8 text-center bg-muted/10">
                  <p className="text-sm text-muted-foreground">No tasks have been created for this project yet.</p>
                  <Button variant="link" asChild className="mt-2 text-primary h-auto p-0">
                    <Link href={`/tasks/new?project=${project.id}`}>Create the first task</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar (Metadata) */}
          <div className="space-y-8">
            
            {/* Leadership */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Leadership</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-muted-foreground mb-2 block">Project Lead</span>
                  <div className="flex items-center gap-3 bg-muted/20 border border-border/40 rounded-lg p-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={project.lead.avatarUrl} />
                      <AvatarFallback className="bg-primary/10 text-xs">{project.lead.firstName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none text-foreground">{project.lead.firstName} {project.lead.lastName}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground mb-2 block">Owning Team</span>
                  <div className="flex items-center gap-3 bg-muted/20 border border-border/40 rounded-lg p-3">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none text-foreground">{project.team?.name || "No Team"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Properties */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Properties</h3>
              <div className="space-y-4 bg-muted/10 p-4 rounded-lg border border-border/40">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Start Date</span>
                  <span className="font-medium text-xs bg-background border border-border/50 px-2 py-0.5 rounded">{project.startDate ? new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Flag className="h-3.5 w-3.5" /> Deadline</span>
                  <span className="font-medium text-xs bg-background border border-border/50 px-2 py-0.5 rounded">{project.endDate ? new Date(project.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                </div>
              </div>
            </div>

            {/* Project Members */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Members</h3>
                <span className="text-xs font-medium bg-background border border-border/50 px-2 py-0.5 rounded">{project.members.length}</span>
              </div>
              
              {project.members.length > 0 ? (
                <div className="border border-border/40 rounded-lg bg-background flex flex-col">
                  <div className="divide-y divide-border/40 overflow-y-auto max-h-[300px]">
                    {project.members.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors group">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={m.employee.avatarUrl} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {m.employee.firstName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{m.employee.firstName} {m.employee.lastName}</p>
                          {m.employeeId === project.leadId && (
                            <Badge variant="secondary" className="text-[9px] mt-0.5 h-4 px-1.5 leading-none bg-primary/10 text-primary border-primary/20">Lead</Badge>
                          )}
                        </div>
                        {canDelegate && m.employeeId !== project.leadId && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleOpenPermissions(m)}
                            title="Manage Permissions"
                          >
                            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/40 p-4 text-center bg-muted/10">
                  <p className="text-xs text-muted-foreground">No members assigned.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Edit Project Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-1.5 flex flex-col">
              <label className="text-xs font-semibold text-muted-foreground">Project Name</label>
              <Input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
            </div>
            
            <div className="space-y-1.5 flex flex-col">
              <label className="text-xs font-semibold text-muted-foreground">Description</label>
              <Input value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground">Project Lead</label>
                <Select value={editData.leadId} onValueChange={val => setEditData({ ...editData, leadId: val })}>
                  <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                  <SelectContent>
                    {allEmployees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground">Owning Team</label>
                <Select value={editData.teamId} onValueChange={val => setEditData({ ...editData, teamId: val })}>
                  <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {allTeams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground">Status</label>
                <Select value={editData.status} onValueChange={val => setEditData({ ...editData, status: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(statusColors).map(status => (
                      <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                <Select value={editData.priority} onValueChange={val => setEditData({ ...editData, priority: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(priorityColors).map(priority => (
                      <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>
          <DialogFooter className="pt-4 border-t border-border/40 mt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleUpdateProject} disabled={isPending || !editData.name || !editData.leadId || !editData.teamId} className="w-full sm:w-auto">
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Modal */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Project Members</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-2 pr-2">
            {allEmployees.filter(emp => emp.id !== project.leadId).map(emp => {
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

      {/* Member Permissions Dialog */}
      <MemberPermissionsDialog 
        open={permOpen}
        onOpenChange={setPermOpen}
        projectId={project.id}
        member={selectedMember}
        delegatedPerms={project.delegatedPerms || []}
      />
    </div>
  );
}
