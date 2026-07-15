"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { chartData } from "@/lib/mock-data";
import { BarChart3, TrendingUp, Activity, PieChart } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[11px] text-muted-foreground">
          {p.name}: <span className="font-medium text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export function DashboardCharts() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Productivity Trend */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10">
                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <CardTitle className="text-sm font-semibold">Company Productivity</CardTitle>
            </div>
            <Badge variant="secondary" className="text-[10px] text-green-500 bg-green-500/10 border-0">+12%</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.productivity}>
                <defs>
                  <linearGradient id="prodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" domain={[60, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name="Productivity" stroke="hsl(217, 91%, 60%)" fill="url(#prodGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sprint Velocity */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/10">
                <Activity className="h-3.5 w-3.5 text-purple-500" />
              </div>
              <CardTitle className="text-sm font-semibold">Sprint Velocity</CardTitle>
            </div>
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" /> Planned</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Completed</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.velocity} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="sprint" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="planned" name="Planned" fill="hsl(271, 91%, 65%)" radius={[3, 3, 0, 0]} opacity={0.4} />
                <Bar dataKey="completed" name="Completed" fill="hsl(160, 84%, 39%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10">
              <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <CardTitle className="text-sm font-semibold">Team Performance</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.teamPerformance} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" domain={[0, 100]} />
                <YAxis dataKey="team" type="category" tick={{ fontSize: 11 }} className="text-muted-foreground" width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" name="Score" radius={[0, 4, 4, 0]}>
                  {chartData.teamPerformance.map((entry, i) => (
                    <Cell key={i} fill={entry.score >= 90 ? "hsl(160, 84%, 39%)" : entry.score >= 80 ? "hsl(217, 91%, 60%)" : "hsl(38, 92%, 50%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Task Completion */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10">
                <PieChart className="h-3.5 w-3.5 text-cyan-500" />
              </div>
              <CardTitle className="text-sm font-semibold">Task Completion Trend</CardTitle>
            </div>
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-500" /> Completed</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Created</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.taskCompletion}>
                <defs>
                  <linearGradient id="compGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(187, 92%, 45%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(187, 92%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="creatGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="hsl(187, 92%, 45%)" fill="url(#compGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="created" name="Created" stroke="hsl(25, 95%, 53%)" fill="url(#creatGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
