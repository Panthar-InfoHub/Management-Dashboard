"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteCalendarDayAction, upsertCalendarDayAction } from "@/lib/actions/attendance-settings.actions";
import { DAY_KIND_LABELS, WEEKDAYS, fromDateKey, type DayKindValue } from "@/lib/attendance/calendar";
import { errorMessage } from "@/lib/utils";

type CalendarRow = { id: string; date: string; kind: DayKindValue; name: string | null };

const KIND_STYLES: Record<DayKindValue, string> = {
  HOLIDAY: "bg-red-500/10 text-red-600 border-red-500/20",
  OFFICE: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  WFH: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  OFF: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

function formatDay(key: string) {
  const d = fromDateKey(key);
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)}, ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`;
}

export function CalendarTab({ days }: { days: CalendarRow[] }) {
  const [isPending, startTransition] = useTransition();
  const rows = days;
  const [form, setForm] = useState<{ date: string; kind: DayKindValue; name: string }>({ date: "", kind: "HOLIDAY", name: "" });

  const add = () => {
    startTransition(async () => {
      try {
        await upsertCalendarDayAction(form);
        toast.success(form.kind === "HOLIDAY" ? `Holiday “${form.name}” added` : `${formatDay(form.date)} set to ${DAY_KIND_LABELS[form.kind]}`);
        setForm((f) => ({ ...f, date: "", name: "" }));
      } catch (err) {
        toast.error(errorMessage(err, "Day not saved. Try again."));
      }
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-sm font-medium">Holidays and Special Days</h3>
        <p className="text-xs text-muted-foreground">
          A date here overrides the working week. Example: make one Saturday an office day, or add a holiday.
        </p>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-border/40 p-4 sm:grid-cols-[160px_170px_1fr_auto] sm:items-end"
        onSubmit={(e) => { e.preventDefault(); add(); }}
      >
        <div className="space-y-1.5">
          <label htmlFor="cal-date" className="text-xs font-semibold text-muted-foreground">Date</label>
          <Input id="cal-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} disabled={isPending} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Day Is</label>
          <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as DayKindValue })} disabled={isPending}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(DAY_KIND_LABELS) as DayKindValue[]).map((k) => <SelectItem key={k} value={k}>{DAY_KIND_LABELS[k]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="cal-name" className="text-xs font-semibold text-muted-foreground">Name {form.kind !== "HOLIDAY" && "(optional)"}</label>
          <Input id="cal-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={form.kind === "HOLIDAY" ? "e.g. Diwali" : "e.g. Release day"} disabled={isPending} />
        </div>
        <Button type="submit" disabled={isPending || !form.date || (form.kind === "HOLIDAY" && !form.name.trim())}>Add Day</Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No holidays or special days yet. Add the first one above.</p>
      ) : (
        <ul className="divide-y divide-border/40 rounded-lg border border-border/40">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-36 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{formatDay(row.date)}</span>
                <Badge variant="outline" className={`text-[10px] ${KIND_STYLES[row.kind]}`}>{DAY_KIND_LABELS[row.kind]}</Badge>
                {row.name && <span className="truncate text-sm">{row.name}</span>}
              </div>
              <ConfirmAction
                trigger={
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" aria-label={`Remove ${formatDay(row.date)}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                }
                title={`Remove ${formatDay(row.date)}?`}
                description={`It goes back to the normal working week${row.name ? ` (removes “${row.name}”)` : ""}.`}
                confirmLabel="Remove Day"
                pendingLabel="Removing…"
                destructive
                onConfirm={async () => { await deleteCalendarDayAction(row.id); return `${formatDay(row.date)} back to the weekly default`; }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
