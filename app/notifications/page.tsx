"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notifications } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Bell, Check, CheckCheck, ClipboardCheck, AtSign, Star, Rocket, Calendar, MessageSquare, Megaphone } from "lucide-react";

const categoryIcons: Record<string, { icon: React.ElementType; color: string }> = {
  tasks: { icon: ClipboardCheck, color: "text-blue-500 bg-blue-500/10" },
  mentions: { icon: AtSign, color: "text-purple-500 bg-purple-500/10" },
  reviews: { icon: Star, color: "text-amber-500 bg-amber-500/10" },
  releases: { icon: Rocket, color: "text-green-500 bg-green-500/10" },
  deadlines: { icon: Calendar, color: "text-red-500 bg-red-500/10" },
  "daily-updates": { icon: MessageSquare, color: "text-cyan-500 bg-cyan-500/10" },
  announcements: { icon: Megaphone, color: "text-pink-500 bg-pink-500/10" },
};

export default function NotificationsPage() {
  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">Stay up to date with your team.</p>
        </div>
        <Button variant="secondary" size="sm" className="gap-2 text-xs">
          <CheckCheck className="h-3.5 w-3.5" /> Mark All Read
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="text-xs">All <Badge variant="secondary" className="ml-1 text-[9px]">{notifications.length}</Badge></TabsTrigger>
          <TabsTrigger value="unread" className="text-xs">Unread <Badge variant="secondary" className="ml-1 text-[9px] bg-destructive/10 text-destructive">{unread.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-0 divide-y divide-border">
              {unread.length > 0 && (
                <>
                  <p className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-accent/30">Today</p>
                  {unread.map(n => {
                    const config = categoryIcons[n.category] || categoryIcons.tasks;
                    const Icon = config.icon;
                    return (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", config.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground">{n.description}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{n.time}</p>
                        </div>
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      </div>
                    );
                  })}
                </>
              )}
              {read.length > 0 && (
                <>
                  <p className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-accent/30">Earlier</p>
                  {read.map(n => {
                    const config = categoryIcons[n.category] || categoryIcons.tasks;
                    const Icon = config.icon;
                    return (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer opacity-60">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", config.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground">{n.description}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unread" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-0 divide-y divide-border">
              {unread.map(n => {
                const config = categoryIcons[n.category] || categoryIcons.tasks;
                const Icon = config.icon;
                return (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground">{n.description}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{n.time}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"><Check className="h-3 w-3" /></Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
