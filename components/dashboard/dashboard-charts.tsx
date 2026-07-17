"use client";

import { TrendingUp, Layers, Users } from "lucide-react";
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ROLE_COLORS, formatEnumLabel } from "@/lib/dashboard-colors";

type DataPoint = { name: string; value: number };
type TrendPoint = { date: string; value: number; created: number };

interface ChartsData {
  roles: DataPoint[];
  teamWorkload: DataPoint[];
}

function buildRoleConfig(data: DataPoint[]): ChartConfig {
  const config: ChartConfig = {};
  data.forEach((entry) => {
    config[entry.name] = { label: formatEnumLabel(entry.name), color: ROLE_COLORS[entry.name] ?? "#6b7280" };
  });
  return config;
}

function Panel({
  icon: Icon,
  iconClassName,
  title,
  description,
  children,
  className,
}: {
  icon: React.ElementType;
  iconClassName: string;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-[320px] flex-col overflow-hidden rounded-xl border border-border/40 bg-background ${className ?? ""}`}>
      <div className="flex items-center gap-3 border-b border-border/40 bg-muted/10 p-4">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background ${iconClassName}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="truncate text-[11px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}

export function DashboardCharts({
  chartData,
  completionTrend,
}: {
  chartData: ChartsData | null;
  completionTrend: TrendPoint[] | null;
}) {
  if (!chartData) return null;

  const { roles, teamWorkload } = chartData;
  const pRoles = roles.map((e) => ({ ...e, fill: ROLE_COLORS[e.name] ?? "#6b7280" }));
  const totalEmployees = roles.reduce((sum, r) => sum + r.value, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 1. Completion vs Creation Trend */}
      <Panel icon={TrendingUp} iconClassName="text-blue-500" title="Task Velocity" description="Tasks created vs completed, last 14 days" className="lg:col-span-2">
        {completionTrend && completionTrend.length > 0 ? (
          <ChartContainer config={{ value: { label: "Completed", color: "#3b82f6" }, created: { label: "Created", color: "#8b5cf6" } }} className="aspect-auto h-full w-full">
            <AreaChart data={completionTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={1} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} width={24} />
              <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="created" stroke="#8b5cf6" strokeWidth={2} fill="url(#createdGradient)" />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#completionGradient)" />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No completions yet in this window.</div>
        )}
      </Panel>

      {/* 2. Team Composition */}
      <Panel icon={Users} iconClassName="text-emerald-500" title="Team Composition" description="Active members by role" className="lg:col-span-1">
        <div className="flex h-full flex-col">
          <div className="relative min-h-0 flex-1">
            <ChartContainer config={buildRoleConfig(roles)} className="aspect-auto h-full w-full">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={pRoles} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} stroke="none">
                  {pRoles.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold tabular-nums text-foreground">{totalEmployees}</span>
              <span className="text-[10px] text-muted-foreground">Members</span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[10px]">
            {pRoles.map((entry, index) => (
              <span key={index} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                {formatEnumLabel(entry.name)} <span className="ml-0.5 font-medium text-foreground">{entry.value}</span>
              </span>
            ))}
          </div>
        </div>
      </Panel>

      {/* 3. Team Workload */}
      <Panel icon={Layers} iconClassName="text-indigo-500" title="Team Workload" description="Open tasks by team" className="lg:col-span-1">
        {teamWorkload.length > 0 ? (
          <ChartContainer config={{ value: { label: "Open Tasks", color: "#3b82f6" } }} className="aspect-auto h-full w-full">
            <RadarChart data={teamWorkload} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <PolarGrid stroke="var(--border)" opacity={0.5} />
              <PolarAngleAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Radar name="Tasks" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.3} />
            </RadarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No teams yet.</div>
        )}
      </Panel>
    </div>
  );
}
