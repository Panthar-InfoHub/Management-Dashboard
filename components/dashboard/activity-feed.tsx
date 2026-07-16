import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const iconMap: Record<string, { icon: any; color: string }> = {
  CREATE: { icon: Activity, color: "text-blue-500 bg-blue-500/10" },
  UPDATE: { icon: Activity, color: "text-amber-500 bg-amber-500/10" },
  STATUS_CHANGE: { icon: Activity, color: "text-purple-500 bg-purple-500/10" },
  DELETE: { icon: Activity, color: "text-red-500 bg-red-500/10" },
};

export function ActivityFeed({ activities }: { activities: any[] }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground/5">
            <Activity className="h-3.5 w-3.5 text-foreground" />
          </div>
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative space-y-0">
          {activities.map((item, idx) => {
            const config = iconMap[item.action] || iconMap.UPDATE;
            const Icon = config.icon;
            
            return (
              <div key={item.id} className="group relative flex gap-3 py-2.5 hover:bg-accent/30 rounded-md px-2 -mx-2 transition-colors">
                {/* Timeline line */}
                {idx < activities.length - 1 && (
                  <div className="absolute left-[18px] top-[36px] bottom-0 w-px bg-border" />
                )}
                <div className={cn("relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", config.color)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed">
                    <span className="font-medium text-foreground">{item.actor?.firstName || "System"}</span>
                    <span className="text-muted-foreground"> {item.action.replace("_", " ").toLowerCase()} a {item.entity.toLowerCase()}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground/60 pt-0.5">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </div>
            );
          })}
          {activities.length === 0 && (
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground">No recent activity.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
