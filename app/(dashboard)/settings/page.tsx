"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User, Bell, Palette, Shield, Keyboard, Users, Building, Plug, KeyRound } from "lucide-react";
import { RolesTab } from "@/components/settings/roles-tab";

const tabs = [
  { value: "profile", label: "Profile", icon: User },
  { value: "workspace", label: "Workspace", icon: Building },
  { value: "members", label: "Members", icon: Users },
  { value: "roles", label: "Roles & Permissions", icon: KeyRound },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "appearance", label: "Appearance", icon: Palette },
  { value: "security", label: "Security", icon: Shield },
  { value: "integrations", label: "Integrations", icon: Plug },
  { value: "shortcuts", label: "Keyboard Shortcuts", icon: Keyboard },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your workspace preferences and configurations.</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="flex flex-col gap-0.5 w-48 shrink-0">
          {tabs.map(item => (
            <button
              key={item.value}
              onClick={() => setActiveTab(item.value)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors text-left",
                activeTab === item.value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-3.5 w-3.5" /> {item.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-10">
          {activeTab === "profile" && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-sm font-semibold">Profile</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16"><AvatarFallback className="text-lg bg-primary/10">SM</AvatarFallback></Avatar>
                  <div>
                    <Button variant="secondary" size="sm" className="text-xs">Change Avatar</Button>
                    <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">First Name</Label><Input defaultValue="Shiva" className="mt-1.5 h-9 text-sm" /></div>
                  <div><Label className="text-xs">Last Name</Label><Input defaultValue="M." className="mt-1.5 h-9 text-sm" /></div>
                </div>
                <div><Label className="text-xs">Email</Label><Input defaultValue="shiva@panthar.io" className="mt-1.5 h-9 text-sm" /></div>
                <div><Label className="text-xs">Role</Label><Input defaultValue="Admin" className="mt-1.5 h-9 text-sm" disabled /></div>
                <Button size="sm" className="text-xs">Save Changes</Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "workspace" && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-sm font-semibold">Workspace Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label className="text-xs">Workspace Name</Label><Input defaultValue="Panthar Engineering" className="mt-1.5 h-9 text-sm" /></div>
                <div><Label className="text-xs">URL Slug</Label><Input defaultValue="panthar-eng" className="mt-1.5 h-9 text-sm" /></div>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-xs font-medium">Preferences</h3>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-xs">Daily Update Reminder</Label><p className="text-[10px] text-muted-foreground">Send reminders at 5 PM daily</p></div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-xs">Weekend Standup</Label><p className="text-[10px] text-muted-foreground">Require updates on weekends</p></div>
                    <Switch />
                  </div>
                </div>
                <Button size="sm" className="text-xs">Save Changes</Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "members" && (
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-sm font-semibold">Members</CardTitle><Button size="sm" className="text-xs">Invite Member</Button></CardHeader>
              <CardContent className="space-y-2">
                {[{ name: "Shiva M.", role: "Admin", email: "shiva@panthar.io", avatar: "SM" }, { name: "Arjun Mehta", role: "Member", email: "arjun@panthar.io", avatar: "AM" }, { name: "Priya Sharma", role: "Member", email: "priya@panthar.io", avatar: "PS" }].map(m => (
                  <div key={m.email} className="flex items-center gap-3 rounded-md p-2 hover:bg-accent/30 transition-colors">
                    <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10">{m.avatar}</AvatarFallback></Avatar>
                    <div className="flex-1"><p className="text-xs font-medium">{m.name}</p><p className="text-[10px] text-muted-foreground">{m.email}</p></div>
                    <Badge variant="secondary" className="text-[10px]">{m.role}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "roles" && (
            <RolesTab />
          )}

          {activeTab === "notifications" && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-sm font-semibold">Notification Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {["Task assignments", "Mentions", "Daily update reminders", "Sprint updates", "Deadline warnings", "Release notifications", "New team members"].map(item => (
                  <div key={item} className="flex items-center justify-between py-1">
                    <Label className="text-xs">{item}</Label>
                    <Switch defaultChecked={!item.includes("Release")} />
                  </div>
                ))}
                <Separator />
                <Button size="sm" className="text-xs">Save Preferences</Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "appearance" && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-sm font-semibold">Appearance</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Theme</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {["Light", "Dark", "System"].map(t => (
                      <button key={t} className="rounded-lg border border-border p-3 text-center text-xs hover:bg-accent transition-colors focus:ring-2 ring-primary">{t}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div><Label className="text-xs">Compact Mode</Label><p className="text-[10px] text-muted-foreground">Reduce spacing and padding</p></div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label className="text-xs">Sidebar Collapsed</Label><p className="text-[10px] text-muted-foreground">Start with collapsed sidebar</p></div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "security" && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-sm font-semibold">Security</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><Label className="text-xs">Two-Factor Authentication</Label><p className="text-[10px] text-muted-foreground">Add extra security to your account</p></div>
                  <Button variant="secondary" size="sm" className="text-xs">Enable</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div><Label className="text-xs">Active Sessions</Label><p className="text-[10px] text-muted-foreground">Manage your active sessions</p></div>
                  <Badge variant="secondary" className="text-[10px]">2 active</Badge>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs">Change Password</Label>
                  <Input type="password" placeholder="Current password" className="mt-1.5 h-9 text-sm" />
                  <Input type="password" placeholder="New password" className="mt-2 h-9 text-sm" />
                  <Button size="sm" className="text-xs mt-3">Update Password</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "integrations" && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-sm font-semibold">Integrations</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[{ name: "Slack", desc: "Notifications and commands", connected: true }, { name: "GitHub", desc: "Repository sync", connected: true }, { name: "Figma", desc: "Design file sync", connected: false }, { name: "Jira", desc: "Task import/export", connected: false }, { name: "Google Calendar", desc: "Calendar sync", connected: false }].map(int => (
                  <div key={int.name} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div><p className="text-xs font-medium">{int.name}</p><p className="text-[10px] text-muted-foreground">{int.desc}</p></div>
                    <Button variant={int.connected ? "secondary" : "default"} size="sm" className="text-xs">{int.connected ? "Connected" : "Connect"}</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "shortcuts" && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="text-sm font-semibold">Keyboard Shortcuts</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[["⌘K", "Open command palette"], ["⌘/", "Search"], ["⌘N", "New task"], ["⌘⇧P", "New project"], ["⌘D", "Dashboard"], ["⌘⇧U", "Submit daily update"], ["Esc", "Close dialog"]].map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-muted-foreground">{desc}</span>
                    <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-[11px]">{key}</kbd>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
