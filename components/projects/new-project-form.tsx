"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { createProjectAction } from "@/lib/actions/project.actions";

export function NewProjectForm({ 
  employees,
  teams
}: { 
  employees: { id: string; firstName: string; lastName: string }[];
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [newProject, setNewProject] = useState<{
    name: string;
    description: string;
    goals: string;
    status: any;
    priority: any;
    lead: string;
    team: string;
    startDate: Date | undefined;
    endDate: Date | undefined;
    addTeamMembers: boolean;
  }>({ 
    name: "", 
    description: "",
    goals: "",
    status: "PLANNING", 
    priority: "MEDIUM",
    lead: employees[0]?.id || "",
    team: teams[0]?.id || "",
    startDate: new Date(),
    endDate: (() => {
      const d = new Date(Date.now() + 30 * 86400000);
      d.setHours(23, 59, 59, 999);
      return d;
    })(),
    addTeamMembers: false
  });

  const handleCreateProject = () => {
    if (!newProject.name || !newProject.team || !newProject.lead) return;
    
    startTransition(() => {
      createProjectAction({
        name: newProject.name,
        description: newProject.description || newProject.goals || "A newly created project.",
        status: newProject.status,
        priority: newProject.priority,
        leadId: newProject.lead,
        teamId: newProject.team,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
        addTeamMembers: newProject.addTeamMembers
      }).then(() => {
        router.push("/projects");
      }).catch((err: any) => {
        toast.error(err.message || "Failed to create project");
      });
    });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Bar */}
      <div className="px-4 sm:px-6 py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0" disabled={isPending}>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold flex items-center gap-2 truncate">
              <span className="bg-primary/10 text-primary p-1.5 rounded-md shrink-0"><Plus className="h-3 w-3 sm:h-4 sm:w-4" /></span>
              <span className="truncate">Create New Project</span>
            </h1>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="outline" asChild disabled={isPending} className="flex-1 sm:flex-none">
            <Link href="/projects">Cancel</Link>
          </Button>
          <Button onClick={handleCreateProject} className="flex-1 sm:flex-none sm:px-8" disabled={isPending}>
            {isPending ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/10">
        <div className="max-w-5xl mx-auto grid md:grid-cols-[1fr_320px] gap-6 items-start">
          
          {/* Left Column */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Name</label>
                <Input 
                  value={newProject.name} 
                  onChange={e => setNewProject({ ...newProject, name: e.target.value })} 
                  placeholder="E.g. Q3 Marketing Launch" 
                  className="text-base sm:text-lg font-medium"
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brief Description</label>
                <Textarea 
                  value={newProject.description} 
                  onChange={e => setNewProject({ ...newProject, description: e.target.value })} 
                  placeholder="High-level overview of the project..." 
                  className="min-h-[150px] resize-none"
                />
              </div>
              
              <div className="space-y-2 pt-4 border-t border-border/50">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Goals & Outcomes</label>
                <Textarea 
                  value={newProject.goals} 
                  onChange={e => setNewProject({ ...newProject, goals: e.target.value })} 
                  placeholder="What are the key deliverables?" 
                  className="min-h-[150px] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Sidebar */}
          <Card className="border-border/50 shadow-sm bg-muted/20">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Project Lead</label>
                <Select value={newProject.lead} onValueChange={v => setNewProject({ ...newProject, lead: v })}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select lead" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Owning Team</label>
                <Select value={newProject.team} onValueChange={v => setNewProject({ ...newProject, team: v })}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {newProject.team && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">Add all team members to project</span>
                    <Switch 
                      checked={newProject.addTeamMembers} 
                      onCheckedChange={(c) => setNewProject({ ...newProject, addTeamMembers: c })} 
                    />
                  </div>
                )}
              </div>
              
              <div className="h-px w-full bg-border/50 my-2" />
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Status</label>
                <Select value={newProject.status} onValueChange={v => setNewProject({ ...newProject, status: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNING">Planning</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                <Select value={newProject.priority} onValueChange={v => setNewProject({ ...newProject, priority: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-px w-full bg-border/50 my-2" />

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background",
                        !newProject.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newProject.startDate ? format(newProject.startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newProject.startDate}
                      onSelect={(d: any) => setNewProject({ ...newProject, startDate: d })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground">Target End</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background",
                        !newProject.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newProject.endDate ? format(newProject.endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newProject.endDate}
                      onSelect={(d: any) => {
                        if (d) {
                          const end = new Date(d);
                          end.setHours(23, 59, 59, 999);
                          setNewProject({ ...newProject, endDate: end });
                        } else {
                          setNewProject({ ...newProject, endDate: undefined });
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
