"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type Point = { key: string; label: string; done: number; created: number };

// Completed carries the accent; created is a quiet neutral beside it, so the
// pair reads by position and legend, not hue alone.
const config = {
  done: { label: "Completed", color: "var(--chart-1)" },
  created: { label: "Created", color: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)" },
} satisfies ChartConfig;

function Figure({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: "accent" | "up" | "down" }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", tone === "up" && "text-amber-700 dark:text-amber-400", tone === "down" && "text-emerald-700 dark:text-emerald-400")}>{value}</p>
      {detail && <p className="truncate text-[11px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

export function ThroughputPanel({ weekly, daily, scope }: { weekly: Point[]; daily: Point[]; scope: string }) {
  const [mode, setMode] = useState<"weekly" | "daily">("weekly");
  const data = mode === "weekly" ? weekly : daily;
  const done = data.reduce((s, d) => s + d.done, 0);
  const created = data.reduce((s, d) => s + d.created, 0);
  const avg = data.length ? done / data.length : 0;
  const current = data.at(-1)?.done ?? 0;
  const net = created - done;
  const unit = mode === "weekly" ? "week" : "day";

  return (
    <section className="flex flex-col rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)] lg:col-span-2">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Throughput</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{scope} · {mode === "weekly" ? "last 12 weeks" : "last 14 days"}</p>
        </div>
        <div role="radiogroup" aria-label="Period" className="inline-flex rounded-lg border border-border p-0.5">
          {(["weekly", "daily"] as const).map((m) => (
            <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none", mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
              {m === "weekly" ? "Weekly" : "Daily"}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 px-5 pt-4 sm:grid-cols-4">
        <Figure label="Completed" value={done.toLocaleString("en-IN")} tone="accent" detail={`${created} created`} />
        <Figure label={`Average per ${unit}`} value={avg.toFixed(avg < 10 ? 1 : 0)} detail={`this ${unit}: ${current}`} />
        <Figure label={`Best ${unit}`} value={String(Math.max(0, ...data.map((d) => d.done)))} detail={data.reduce((b, d) => (d.done > b.done ? d : b), data[0] ?? { label: "—", done: 0 }).label} />
        <Figure label="Backlog change" value={`${net > 0 ? "+" : ""}${net}`} tone={net > 0 ? "up" : net < 0 ? "down" : undefined} detail={net > 0 ? "more added than finished" : net < 0 ? "finishing faster than adding" : "balanced"} />
      </div>

      <div className="px-2 pt-3 pb-2">
        <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
          <BarChart data={data} barGap={2} barCategoryGap={mode === "weekly" ? "22%" : "18%"} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/70" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={16} className="text-[11px]" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} className="text-[11px]" />
            <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltipContent indicator="dot" />} />
            <Bar dataKey="done" fill="var(--color-done)" radius={[4, 4, 0, 0]} maxBarSize={22} />
            <Bar dataKey="created" fill="var(--color-created)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ChartContainer>
      </div>
      <footer className="flex gap-4 px-5 pb-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--chart-1)]" /> Completed</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/45" /> Created</span>
      </footer>
    </section>
  );
}
