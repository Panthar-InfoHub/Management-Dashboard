"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, LayoutDashboard } from "lucide-react";
import { createTeamAction } from "@/lib/actions/team.actions";

export function TeamsClient({ initialTeams, employees, isAdmin }: { initialTeams: any[], employees: any[], isAdmin: boolean }) {
  const [teamList, setTeamList] = useState(initialTeams);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [newTeam, setNewTeam] = useState({ name: "", description: "", color: "#3b82f6", leadId: "" });

  const handleCreateTeam = () => {
    if (!newTeam.name || !newTeam.leadId) return;
    
    startTransition(() => {
      createTeamAction(newTeam).then((team) => {
        setNewTeamOpen(false);
        setNewTeam({ name: "", description: "", color: "#3b82f6", leadId: "" });
        router.refresh();
      }).catch(err => console.error(err));
    });
  };

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto h-full selection:bg-primary/10">
      <div className="flex items-center justify-between pb-6 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage functional groups and track project assignments.</p>
        </div>
        {isAdmin && (
          <Dialog open={newTeamOpen} onOpenChange={setNewTeamOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 shadow-none"><Plus className="h-4 w-4" /> Create Team</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-muted-foreground">Team Name</label>
                  <Input value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })} placeholder="E.g. Core Infrastructure" />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-muted-foreground">Description (Optional)</label>
                  <Input value={newTeam.description} onChange={e => setNewTeam({ ...newTeam, description: e.target.value })} placeholder="What does this team do?" />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-muted-foreground">Team Lead</label>
                  <Select value={newTeam.leadId} onValueChange={val => setNewTeam({ ...newTeam, leadId: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-muted-foreground">Team Color</label>
                  <div className="flex gap-2">
                    <Input type="color" value={newTeam.color} onChange={e => setNewTeam({ ...newTeam, color: e.target.value })} className="w-12 h-9 p-1 cursor-pointer" />
                    <Input value={newTeam.color} onChange={e => setNewTeam({ ...newTeam, color: e.target.value })} className="flex-1 font-mono text-sm uppercase" />
                  </div>
                </div>
                <Button onClick={handleCreateTeam} disabled={isPending || !newTeam.name || !newTeam.leadId} className="w-full mt-2">
                  {isPending ? "Creating..." : "Create Team"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {teamList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/40 p-12 text-center bg-muted/10">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No teams found</h3>
          <p className="text-sm text-muted-foreground mb-4">Get started by creating your first team.</p>
          {isAdmin && (
            <Button variant="outline" onClick={() => setNewTeamOpen(true)}>Create Team</Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teamList.map(team => {
            const lead = team.lead;
            const members = team.members;
            
            return (
              <div 
                key={team.id} 
                onClick={() => router.push(`/teams/${team.id}`)}
                className="group flex flex-col bg-background rounded-xl border border-border/40 hover:border-border transition-all cursor-pointer overflow-hidden"
              >
                <div className="p-5 border-b border-border/40 bg-muted/10 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">{team.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{team.description || "No description provided"}</p>
                  </div>
                </div>
                
                <div className="p-5 space-y-5 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Team Lead</p>
                      <div className="flex items-center gap-2">
                        {lead ? (
                          <>
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={lead.avatarUrl} />
                              <AvatarFallback className="text-[8px] bg-primary/10">{lead.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{lead.firstName} {lead.lastName}</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Unassigned</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Projects</p>
                      <div className="flex items-center justify-end gap-1.5 text-sm font-medium">
                        <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground" />
                        {team.projects?.length || 0}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Members</p>
                      <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded">{members.length}</span>
                    </div>
                    <div className="flex -space-x-1.5">
                      {members.slice(0, 5).map((m: any) => (
                        <Avatar key={m.id} className="h-6 w-6 border-2 border-background ring-1 ring-border/20">
                          <AvatarImage src={m.avatarUrl} />
                          <AvatarFallback className="text-[8px] bg-primary/10">{m.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ))}
                      {members.length > 5 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[8px] font-medium">
                          +{members.length - 5}
                        </div>
                      )}
                      {members.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">No members yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
