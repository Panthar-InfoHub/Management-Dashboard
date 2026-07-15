"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  FolderKanban, CheckCircle2, AlertTriangle, Users, Wifi,
  PalmtreeIcon, ClipboardCheck, Clock, AlertCircle, Star,
  Rocket, TrendingUp, Gauge, Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const stats = [
  { label: "Active Projects", value: "5", change: "+2", trend: "up", icon: FolderKanban, color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "Completed", value: "1", change: "+1", trend: "up", icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  { label: "Delayed", value: "1", change: "0", trend: "neutral", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  { label: "Active Employees", value: "12", change: "+1", trend: "up", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
  { label: "Online Now", value: "8", change: "", trend: "neutral", icon: Wifi, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "On Leave", value: "0", change: "", trend: "neutral", icon: PalmtreeIcon, color: "text-teal-500", bg: "bg-teal-500/10" },
  { label: "Open Tasks", value: "10", change: "-3", trend: "down", icon: ClipboardCheck, color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "Due Today", value: "2", change: "", trend: "neutral", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
  { label: "Overdue", value: "1", change: "+1", trend: "up", icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
  { label: "Reviews Pending", value: "3", change: "-1", trend: "down", icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { label: "Upcoming Releases", value: "2", change: "", trend: "neutral", icon: Rocket, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { label: "Sprint Velocity", value: "42", change: "+8%", trend: "up", icon: TrendingUp, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { label: "Weekly Productivity", value: "91%", change: "+5%", trend: "up", icon: Gauge, color: "text-violet-500", bg: "bg-violet-500/10" },
  { label: "Company Health", value: "94", change: "+2", trend: "up", icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
];

export function OverviewCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
      {stats.map((stat) => (
        <Card key={stat.label} className="group relative overflow-hidden border-border/50 bg-card transition-all hover:border-border hover:shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", stat.bg)}>
                <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
              </div>
              {stat.change && (
                <span className={cn(
                  "text-[10px] font-medium",
                  stat.trend === "up" && stat.label !== "Overdue" ? "text-green-500" : "",
                  stat.trend === "up" && stat.label === "Overdue" ? "text-red-500" : "",
                  stat.trend === "down" ? "text-green-500" : "",
                  stat.trend === "neutral" ? "text-muted-foreground" : "",
                )}>
                  {stat.change}
                </span>
              )}
            </div>
            <div className="mt-2">
              <p className="text-lg font-semibold tracking-tight text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{stat.label}</p>
            </div>
            {/* Sparkline dot pattern */}
            <div className="mt-2 flex items-end gap-[2px] h-3">
              {[40, 65, 50, 80, 60, 90, 75, 85].map((h, i) => (
                <div key={i} className={cn("w-[3px] rounded-full opacity-30 group-hover:opacity-50 transition-opacity", stat.bg.replace("/10", "/40"))} style={{ height: `${h}%` }} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
