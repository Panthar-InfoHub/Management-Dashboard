"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { insights } from "@/lib/mock-data";
import { Sparkles, TrendingUp, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = {
  success: TrendingUp,
  warning: AlertTriangle,
  alert: AlertCircle,
  info: Info,
};

const colorMap = {
  success: { border: "border-green-500/20", bg: "bg-green-500/5", icon: "text-green-500", badge: "bg-green-500/10 text-green-600 dark:text-green-400" },
  warning: { border: "border-amber-500/20", bg: "bg-amber-500/5", icon: "text-amber-500", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  alert: { border: "border-red-500/20", bg: "bg-red-500/5", icon: "text-red-500", badge: "bg-red-500/10 text-red-600 dark:text-red-400" },
  info: { border: "border-blue-500/20", bg: "bg-blue-500/5", icon: "text-blue-500", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
};

export function InsightsPanel() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/10">
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <CardTitle className="text-sm font-semibold">Executive Insights</CardTitle>
          <Badge variant="secondary" className="ml-auto text-[10px] bg-purple-500/10 text-purple-500">AI-Powered</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {insights.map((insight) => {
          const colors = colorMap[insight.type as keyof typeof colorMap];
          const Icon = iconMap[insight.type as keyof typeof iconMap];
          return (
            <div key={insight.id} className={cn("flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50", colors.border, colors.bg)}>
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", colors.icon)} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-relaxed">{insight.text}</p>
              </div>
              <Badge className={cn("shrink-0 text-[10px] font-medium border-0", colors.badge)}>
                {insight.metric}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
