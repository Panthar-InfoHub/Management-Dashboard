"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Bell, Check, CheckCheck, ClipboardCheck, Users, FolderOpen, ArrowRight } from "lucide-react";
import { markNotificationAsReadAction, markAllNotificationsAsReadAction } from "@/lib/actions/notification.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const categoryIcons: Record<string, { icon: React.ElementType; color: string }> = {
  TASK_ASSIGNED: { icon: ClipboardCheck, color: "text-blue-500 bg-blue-500/10" },
  TEAM_ADDED: { icon: Users, color: "text-purple-500 bg-purple-500/10" },
  PROJECT_ADDED: { icon: FolderOpen, color: "text-amber-500 bg-amber-500/10" },
};

export function NotificationsClient({ initialNotifications }: { initialNotifications: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    startTransition(() => {
      markNotificationAsReadAction(id).then(() => {
        router.refresh();
      }).catch((err) => toast.error(err.message));
    });
  };

  const handleMarkAllRead = () => {
    startTransition(() => {
      markAllNotificationsAsReadAction().then(() => {
        toast.success("All notifications marked as read");
        router.refresh();
      }).catch((err) => toast.error(err.message));
    });
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const unread = initialNotifications.filter(n => !n.isRead);
  const read = initialNotifications.filter(n => n.isRead);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">Stay up to date with your team.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleMarkAllRead} disabled={isPending || unread.length === 0} className="gap-2 text-xs">
          <CheckCheck className="h-3.5 w-3.5" /> Mark All Read
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="unread" className="text-xs">Unread <Badge variant="secondary" className="ml-1 text-[9px] bg-destructive/10 text-destructive">{unread.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-0 divide-y divide-border">
              {initialNotifications.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No notifications yet.
                </div>
              )}
              {unread.length > 0 && (
                <>
                  <p className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-accent/30">New</p>
                  {unread.map(n => {
                    const config = categoryIcons[n.type] || categoryIcons.TASK_ASSIGNED;
                    const Icon = config.icon;
                    return (
                      <div key={n.id} onClick={() => handleNotificationClick(n)} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", config.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 z-10" onClick={(e) => handleMarkAsRead(n.id, e)}><Check className="h-3 w-3" /></Button>
                      </div>
                    );
                  })}
                </>
              )}
              {read.length > 0 && (
                <>
                  <p className="px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-accent/30">Earlier</p>
                  {read.map(n => {
                    const config = categoryIcons[n.type] || categoryIcons.TASK_ASSIGNED;
                    const Icon = config.icon;
                    return (
                      <div key={n.id} onClick={() => handleNotificationClick(n)} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer opacity-60">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", config.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {n.actionUrl && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
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
              {unread.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  You're all caught up!
                </div>
              )}
              {unread.map(n => {
                const config = categoryIcons[n.type] || categoryIcons.TASK_ASSIGNED;
                const Icon = config.icon;
                return (
                  <div key={n.id} onClick={() => handleNotificationClick(n)} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 z-10" onClick={(e) => handleMarkAsRead(n.id, e)}><Check className="h-3 w-3" /></Button>
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
