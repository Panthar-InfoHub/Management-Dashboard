"use client";
import { DatePicker } from "@/components/ui/date-picker";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteCalendarDayAction, deleteCalendarDaysAction, upsertCalendarDayAction } from "@/lib/actions/attendance-settings.actions";
import { ImportHolidaysDialog } from "@/components/settings/import-holidays-dialog";
import { DAY_KIND_LABELS, WEEKDAYS, fromDateKey, type DayKindValue } from "@/lib/attendance/calendar";
import { cn, errorMessage } from "@/lib/utils";

type CalendarRow = { id: string; date: string; kind: DayKindValue; name: string | null };

const KIND_STYLES: Record<DayKindValue, string> = {
  HOLIDAY: "bg-red-500/10 text-red-600 border-red-500/20",
  OFFICE: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  WFH: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  OFF: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sat, 4 Sep 2027": fixed three-letter names so the date column lines up. */
function formatDay(key: string) {
  const d = fromDateKey(key);
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Consecutive dates with the same kind and name show as one range ("Diwali Break · 4 days"). */
function groupRuns(rows: CalendarRow[]) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const groups: { rows: CalendarRow[] }[] = [];
  for (const row of sorted) {
    const g = groups[groups.length - 1];
    const prev = g?.rows[g.rows.length - 1];
    const nextDay = prev ? new Date(fromDateKey(prev.date).getTime() + 86_400_000).toISOString().slice(0, 10) : null;
    if (prev && nextDay === row.date && prev.kind === row.kind && (prev.name ?? "") === (row.name ?? "")) g.rows.push(row);
    else groups.push({ rows: [row] });
  }
  return groups;
}

export function CalendarTab({ days, currentYear }: { days: CalendarRow[]; currentYear: number }) {
  const [isPending, startTransition] = useTransition();
  const rows = days;
  const [form, setForm] = useState<{ date: string; endDate: string; kind: DayKindValue; name: string }>({ date: "", endDate: "", kind: "HOLIDAY", name: "" });
  const [several, setSeveral] = useState(false);
  const groups = groupRuns(rows);
  const span = several && form.date && form.endDate && form.endDate >= form.date
    ? Math.round((fromDateKey(form.endDate).getTime() - fromDateKey(form.date).getTime()) / 86_400_000) + 1
    : 1;
  const ready = !!form.date && (!several || (!!form.endDate && form.endDate >= form.date)) && (form.kind !== "HOLIDAY" || !!form.name.trim());

  const add = () => {
    startTransition(async () => {
      try {
        const res = await upsertCalendarDayAction({ ...form, endDate: several ? form.endDate : null });
        const what = form.kind === "HOLIDAY" ? `Holiday “${form.name}”` : DAY_KIND_LABELS[form.kind];
        toast.success(res.days > 1 ? `${what} added for ${res.days} days` : form.kind === "HOLIDAY" ? `${what} added` : `${formatDay(form.date)} set to ${what}`);
        setForm((f) => ({ ...f, date: "", endDate: "", name: "" }));
      } catch (err) {
        toast.error(errorMessage(err, "Day not saved. Try again."));
      }
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Holidays and Special Days</h3>
          <p className="text-xs text-muted-foreground">
            A date here overrides the working week. Example: make one Saturday an office day, or add a holiday.
          </p>
        </div>
        <ImportHolidaysDialog currentYear={currentYear} />
      </div>

      <form
        className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-[0_2px_2px_rgba(0,0,0,0.04)]"
        onSubmit={(e) => { e.preventDefault(); add(); }}
      >
        <div role="radiogroup" aria-label="How many days" className="inline-flex rounded-lg border border-border p-0.5">
          {([[false, "One day"], [true, "Several days"]] as const).map(([v, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={several === v}
              onClick={() => setSeveral(v)}
              disabled={isPending}
              className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors", several === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={cn("grid gap-3 sm:items-start", several ? "sm:grid-cols-[150px_150px_160px_1fr]" : "sm:grid-cols-[160px_170px_1fr]")}>
          <div className="space-y-1.5">
            <label htmlFor="cal-date" className="text-xs font-semibold text-muted-foreground">{several ? "From" : "Date"}</label>
            <DatePicker id="cal-date" value={form.date} max={several && form.endDate ? form.endDate : undefined} onChange={(v) => setForm({ ...form, date: v })} disabled={isPending} />
          </div>
          {several && (
            <div className="space-y-1.5">
              <label htmlFor="cal-end" className="text-xs font-semibold text-muted-foreground">To</label>
              <DatePicker id="cal-end" value={form.endDate} min={form.date || undefined} onChange={(v) => setForm({ ...form, endDate: v })} disabled={isPending} />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">{several ? "Days Are" : "Day Is"}</label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as DayKindValue })} disabled={isPending}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(DAY_KIND_LABELS) as DayKindValue[]).map((k) => <SelectItem key={k} value={k}>{DAY_KIND_LABELS[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cal-name" className="text-xs font-semibold text-muted-foreground">Name {form.kind !== "HOLIDAY" && "(optional)"}</label>
            <Input id="cal-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={form.kind === "HOLIDAY" ? (several ? "e.g. Diwali Break" : "e.g. Diwali") : "e.g. Release day"} disabled={isPending} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {several && span > 1 ? `${span} days, weekends included. Dates already set are replaced.` : "Weekly offs stay as they are unless you set them here."}
          </p>
          <Button type="submit" disabled={isPending || !ready}>{several && span > 1 ? `Add ${span} Days` : "Add Day"}</Button>
        </div>
      </form>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No holidays or special days yet. Add the first one above, or import public holidays.</p>
      ) : (
        <ul className="divide-y divide-border/40 rounded-xl border border-border/70 bg-card shadow-[0_2px_2px_rgba(0,0,0,0.04)]">
          {groups.map((g) => {
            const first = g.rows[0], last = g.rows[g.rows.length - 1];
            const when = g.rows.length === 1 ? formatDay(first.date) : `${formatDay(first.date)} – ${formatDay(last.date)}`;
            return (
              <li key={first.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  {/* Fixed width (a range wraps to two lines) so badges and names line up. */}
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground sm:w-32">
                    {g.rows.length === 1 ? when : <>{formatDay(first.date)} –<br className="max-sm:hidden" /> {formatDay(last.date)}</>}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${KIND_STYLES[first.kind]}`}>{DAY_KIND_LABELS[first.kind]}</Badge>
                    {first.name && <span className="truncate text-sm">{first.name}</span>}
                    {g.rows.length > 1 && <span className="shrink-0 text-xs text-muted-foreground">· {g.rows.length} days</span>}
                  </span>
                </div>
                <ConfirmAction
                  trigger={
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" aria-label={`Remove ${when}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  }
                  title={g.rows.length > 1 ? `Remove all ${g.rows.length} days?` : `Remove ${when}?`}
                  description={`${when} go${g.rows.length > 1 ? "" : "es"} back to the normal working week${first.name ? ` (removes “${first.name}”)` : ""}.`}
                  confirmLabel={g.rows.length > 1 ? `Remove ${g.rows.length} Days` : "Remove Day"}
                  pendingLabel="Removing…"
                  destructive
                  onConfirm={async () => {
                    if (g.rows.length === 1) await deleteCalendarDayAction(first.id);
                    else await deleteCalendarDaysAction(g.rows.map((x) => x.id));
                    return `${when} back to the weekly default`;
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
