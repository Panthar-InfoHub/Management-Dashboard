"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { chartData } from "@/lib/mock-data";
import { BarChart3, TrendingUp, Users, Gauge, Activity, Target } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart, Cell, RadialBarChart, RadialBar, PolarAngleAxis
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[11px] text-muted-foreground">{p.name}: <span className="font-medium text-foreground">{p.value}</span></p>
      ))}
    </div>
  );
};

const orgHealth = [
  { name: "Productivity", value: 91, fill: "hsl(217, 91%, 60%)" },
  { name: "Engagement", value: 87, fill: "hsl(271, 91%, 65%)" },
  { name: "Retention", value: 95, fill: "hsl(160, 84%, 39%)" },
  { name: "Satisfaction", value: 82, fill: "hsl(38, 92%, 50%)" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">Executive-level dashboards and performance analytics.</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="teams" className="text-xs">Team Performance</TabsTrigger>
          <TabsTrigger value="projects" className="text-xs">Project Health</TabsTrigger>
          <TabsTrigger value="employees" className="text-xs">Employee Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Org Health Radials */}
          <div className="grid gap-4 sm:grid-cols-4">
            {orgHealth.map(metric => (
              <Card key={metric.name} className="border-border/50">
                <CardContent className="p-4 flex flex-col items-center">
                  <div className="h-24 w-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={[metric]} startAngle={90} endAngle={-270}>
                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                        <RadialBar dataKey="value" cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-lg font-semibold -mt-2">{metric.value}%</p>
                  <p className="text-[11px] text-muted-foreground">{metric.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-sm font-semibold">Weekly Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.weeklyActivity} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="commits" name="Commits" fill="hsl(217, 91%, 60%)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="prs" name="PRs" fill="hsl(271, 91%, 65%)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="reviews" name="Reviews" fill="hsl(160, 84%, 39%)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <CardTitle className="text-sm font-semibold">Productivity Trend</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.productivity}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" domain={[60, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="value" name="Productivity" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Team Comparison</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.teamPerformance} layout="vertical" barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" domain={[0, 100]} />
                    <YAxis dataKey="team" type="category" tick={{ fontSize: 11 }} className="text-muted-foreground" width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="score" name="Performance Score" radius={[0, 4, 4, 0]}>
                      {chartData.teamPerformance.map((entry, i) => (
                        <Cell key={i} fill={entry.score >= 90 ? "hsl(160, 84%, 39%)" : entry.score >= 80 ? "hsl(217, 91%, 60%)" : "hsl(38, 92%, 50%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Sprint Velocity Over Time</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.velocity} barGap={4}>
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
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Task Completion Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.taskCompletion}>
                    <defs>
                      <linearGradient id="rCompGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(187, 92%, 45%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(187, 92%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="completed" name="Completed" stroke="hsl(187, 92%, 45%)" fill="url(#rCompGradient)" strokeWidth={2} />
                    <Area type="monotone" dataKey="created" name="Created" stroke="hsl(25, 95%, 53%)" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
