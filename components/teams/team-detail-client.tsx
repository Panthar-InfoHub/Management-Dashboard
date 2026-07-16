"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, Edit, Users, Mail, LayoutDashboard, Calendar, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = { ACTIVE: "bg-blue-500/10 text-blue-600 border-blue-500/20", PLANNING: "bg-purple-500/10 text-purple-600 border-purple-500/20", PAUSED: "bg-orange-500/10 text-orange-600 border-orange-500/20", COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", ARCHIVED: "bg-gray-500/10 text-gray-600 border-gray-500/20" };

export function TeamDetailClient({ initialTeam }: { initialTeam: any }) {
  const [team] = useState(initialTeam);

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
          <Button variant="outline" size="sm" className="h-8 shadow-none gap-2">
            <Users className="h-4 w-4" /> Manage Members
          </Button>
          <Button size="sm" className="h-8 shadow-none gap-2">
            <Edit className="h-4 w-4" /> Edit Team
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

            {/* Team Projects */}
            <div className="pt-8 border-t border-border/40">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> Team Projects
                </h3>
              </div>

              {team.projects.length > 0 ? (
                <div className="border border-border/40 rounded-lg overflow-hidden bg-background">
                  <div className="divide-y divide-border/40">
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
                  <Users className="h-4 w-4 text-muted-foreground" /> Roster
                </h3>
                <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">{team.members.length} Members</span>
              </div>

              <div className="border border-border/40 rounded-lg overflow-hidden bg-background">
                <div className="divide-y divide-border/40 bg-muted/5">
                  {/* Table Header */}
                  <div className="grid grid-cols-[2fr_1.5fr_1fr_40px] gap-4 px-5 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20">
                    <span>Member</span><span>Role / Designation</span><span>Email</span><span className="text-right"></span>
                  </div>
                  
                  {/* Table Rows */}
                  {team.members.map((member: any) => (
                    <div key={member.id} className="grid grid-cols-[2fr_1.5fr_1fr_40px] gap-4 px-5 py-3.5 items-center hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatarUrl} />
                          <AvatarFallback className="text-xs bg-primary/10">{member.firstName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{member.firstName} {member.lastName}</p>
                          {member.id === team.leadId && (
                            <Badge variant="secondary" className="text-[9px] mt-1 h-4 px-1.5 leading-none">Team Lead</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {member.designation || "—"}
                      </div>
                      <div className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> {member.email}
                      </div>
                      <div className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
                    <Avatar className="h-10 w-10">
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
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><LayoutDashboard className="h-3.5 w-3.5" /> Total Projects</span>
                  <span className="font-medium bg-muted px-2 py-0.5 rounded text-xs">{team.projects.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Total Members</span>
                  <span className="font-medium bg-muted px-2 py-0.5 rounded text-xs">{team.members.length}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
