"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { todayAgenda } from "@/lib/mock-data";
import { Calendar, Clock, Users, Video, Flag, AlertCircle, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  meeting: { icon: Video, color: "text-blue-500", bg: "bg-blue-500/10" },
  deadline: { icon: Flag, color: "text-red-500", bg: "bg-red-500/10" },
  review: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/10" },
  standup: { icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
  release: { icon: Rocket, color: "text-green-500", bg: "bg-green-500/10" },
};

export function TodayAgenda() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/5">
            <Calendar className="h-3.5 w-3.5 text-foreground" />
          </div>
          <CardTitle className="text-sm font-semibold">Today&apos;s Agenda</CardTitle>
          <Badge variant="secondary" className="ml-auto text-[10px]">{todayAgenda.length} events</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        {todayAgenda.map((item, idx) => {
          const config = typeConfig[item.type] || typeConfig.meeting;
          const Icon = config.icon;
          const isPast = idx < 2;
          return (
            <div key={item.id} className={cn(
              "flex items-center gap-3 rounded-lg border border-transparent p-2.5 transition-colors hover:border-border hover:bg-accent/30",
              isPast && "opacity-50"
            )}>
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", config.bg)}>
                <Icon className={cn("h-4 w-4", config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" /> {item.time}
                  </span>
                  <span className="text-[10px] text-muted-foreground">· {item.duration}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Users className="h-3 w-3" /> {item.attendees}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
