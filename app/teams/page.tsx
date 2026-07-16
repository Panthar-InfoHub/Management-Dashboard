"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { teams as mockTeams, employees } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Users, TrendingUp, Gauge, BarChart3, Plus } from "lucide-react";

export default function TeamsPage() {
  const [teamList, setTeamList] = useState(mockTeams);
  const [newTeamOpen, setNewTeamOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", color: "#3b82f6" });

  const handleCreateTeam = () => {
    if (!newTeam.name) return;
    const team = {
      id: `TEAM-${Math.floor(Math.random() * 10000)}`,
      name: newTeam.name,
      lead: employees[0].id,
      members: [employees[0].id],
      velocity: 0,
      capacity: 100,
      color: newTeam.color,
    };
    setTeamList([team, ...teamList]);
    setNewTeam({ name: "", color: "#3b82f6" });
    setNewTeamOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground">Manage teams, view performance, and track workload distribution.</p>
        </div>
        <Dialog open={newTeamOpen} onOpenChange={setNewTeamOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 text-xs"><Plus className="h-3.5 w-3.5" /> Create Team</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Team Name</label>
                <Input value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })} placeholder="E.g. Mobile App Team" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Team Color</label>
                <div className="flex gap-2">
                  <Input type="color" value={newTeam.color} onChange={e => setNewTeam({ ...newTeam, color: e.target.value })} className="w-12 h-9 p-1" />
                  <Input value={newTeam.color} onChange={e => setNewTeam({ ...newTeam, color: e.target.value })} className="flex-1" />
                </div>
              </div>
              <Button onClick={handleCreateTeam} className="w-full mt-4">Create Team</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teamList.map(team => {
          const members = team.members.map(m => employees.find(e => e.id === m)).filter(Boolean);
          const lead = employees.find(e => e.id === team.lead);
          return (
            <Card key={team.id} className="group border-border/50 hover:border-border transition-all hover:shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: team.color + "1a" }}>
                    <Users className="h-5 w-5" style={{ color: team.color }} />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{team.name}</CardTitle>
                    <p className="text-[11px] text-muted-foreground">{members.length} members</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground">Lead:</span>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-4 w-4"><AvatarFallback className="text-[7px] bg-primary/10">{lead?.avatar}</AvatarFallback></Avatar>
                    <span className="font-medium">{lead?.name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md bg-accent/50 p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold mt-0.5">{team.velocity}</p>
                    <p className="text-[9px] text-muted-foreground">Velocity</p>
                  </div>
                  <div className="rounded-md bg-accent/50 p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Gauge className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold mt-0.5">{team.capacity}%</p>
                    <p className="text-[9px] text-muted-foreground">Capacity</p>
                  </div>
                  <div className="rounded-md bg-accent/50 p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <BarChart3 className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold mt-0.5">{members.length}</p>
                    <p className="text-[9px] text-muted-foreground">Members</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-muted-foreground">Capacity</span>
                    <span className="text-[11px] font-medium">{team.capacity}%</span>
                  </div>
                  <Progress value={team.capacity} className="h-1.5" />
                </div>

                <div className="flex -space-x-1.5 pt-1 border-t border-border/50">
                  {members.map(m => (
                    <Avatar key={m!.id} className="h-6 w-6 border-2 border-card">
                      <AvatarFallback className="text-[8px] bg-primary/10">{m!.avatar}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
