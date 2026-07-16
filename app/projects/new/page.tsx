"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projects as mockProjects, employees } from "@/lib/mock-data";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
  const router = useRouter();
  const [newProject, setNewProject] = useState({ 
    name: "", 
    description: "",
    goals: "",
    status: "active", 
    health: "good",
    priority: "medium",
    lead: employees[0]?.id || "",
    team: "Engineering",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    budget: "100000"
  });

  const handleCreateProject = () => {
    if (!newProject.name) return;
    const project = {
      id: `PRJ-${Math.floor(Math.random() * 10000)}`,
      name: newProject.name,
      description: newProject.description || "A newly created project.",
      status: newProject.status,
      health: newProject.health,
      progress: 0,
      lead: newProject.lead,
      members: [newProject.lead],
      team: newProject.team,
      startDate: newProject.startDate,
      endDate: newProject.endDate,
      priority: newProject.priority,
      budget: parseInt(newProject.budget) || 100000,
      spent: 0
    };
    
    // Mutate mock data so it persists during this dev session across pages
    mockProjects.unshift(project);
    
    router.push("/projects");
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Bar */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-1.5 rounded-md"><Plus className="h-4 w-4" /></span>
              Create New Project
            </h1>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/projects">Cancel</Link>
          </Button>
          <Button onClick={handleCreateProject} className="px-8">Create Project</Button>
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
                  className="text-lg font-medium"
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
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Owning Team</label>
                <Select value={newProject.team} onValueChange={v => setNewProject({ ...newProject, team: v })}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Select team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="h-px w-full bg-border/50 my-2" />
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Status</label>
                <Select value={newProject.status} onValueChange={v => setNewProject({ ...newProject, status: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Health</label>
                <Select value={newProject.health} onValueChange={v => setNewProject({ ...newProject, health: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="at-risk">At Risk</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                <Select value={newProject.priority} onValueChange={v => setNewProject({ ...newProject, priority: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-px w-full bg-border/50 my-2" />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
                <Input type="date" value={newProject.startDate} onChange={e => setNewProject({ ...newProject, startDate: e.target.value })} className="bg-background" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Target End</label>
                <Input type="date" value={newProject.endDate} onChange={e => setNewProject({ ...newProject, endDate: e.target.value })} className="bg-background" />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-muted-foreground">Budget ($)</label>
                <Input type="number" value={newProject.budget} onChange={e => setNewProject({ ...newProject, budget: e.target.value })} className="bg-background" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
