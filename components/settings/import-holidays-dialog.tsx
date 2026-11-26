"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { importHolidaysAction, previewPublicHolidaysAction } from "@/lib/actions/attendance-settings.actions";
import { DAY_KIND_LABELS, WEEKDAYS, fromDateKey } from "@/lib/attendance/calendar";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type Preview = Awaited<ReturnType<typeof previewPublicHolidaysAction>>;
type Row = Preview["holidays"][number];

const dayLabel = (key: string) => {
  const d = fromDateKey(key);
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)}, ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}`;
};

/**
 * Pull a year's public holidays from Google's "Holidays in India" calendar and
 * add the ones the company gives. National holidays start ticked.
 */
export function ImportHolidaysDialog({ currentYear }: { currentYear: number }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(currentYear);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [showObservances, setShowObservances] = useState(false);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  const load = (y: number) => {
    setYear(y);
    setPreview(null);
    startLoading(async () => {
      try {
        const res = await previewPublicHolidaysAction(y);
        setPreview(res);
        // Start with the national holidays every company gives (not ones already added).
        setChosen(new Set(res.holidays.filter((h) => h.national && !h.existing).map((h) => h.date)));
      } catch (err) {
        toast.error(errorMessage(err, "Couldn't load holidays. Try again."));
      }
    });
  };

  const openDialog = () => {
    setOpen(true);
    load(year);
  };

  const toggle = (date: string) => setChosen((prev) => {
    const next = new Set(prev);
    if (next.has(date)) next.delete(date); else next.add(date);
    return next;
  });

  const publicRows = preview?.holidays.filter((h) => h.kind === "PUBLIC") ?? [];
  const observances = preview?.holidays.filter((h) => h.kind === "OBSERVANCE") ?? [];
  const addablePublic = publicRows.filter((h) => !h.existing);
  const allPublicOn = addablePublic.length > 0 && addablePublic.every((h) => chosen.has(h.date));

  const save = () => startSaving(async () => {
    const items = (preview?.holidays ?? []).filter((h) => chosen.has(h.date) && !h.existing).map((h) => ({ date: h.date, name: h.name }));
    try {
      const res = await importHolidaysAction(items);
      toast.success(`${res.added} holiday${res.added === 1 ? "" : "s"} added for ${year}${res.skipped ? ` · ${res.skipped} already set, skipped` : ""}`);
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err, "Holidays not added. Try again."));
    }
  });

  const row = (h: Row) => {
    const disabled = !!h.existing || saving;
    return (
      <li key={h.date}>
        <label className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", disabled ? "opacity-60" : "cursor-pointer hover:bg-muted/40")}>
          <Checkbox checked={!!h.existing || chosen.has(h.date)} disabled={disabled} onCheckedChange={() => toggle(h.date)} />
          <span className="w-24 shrink-0 text-xs text-muted-foreground tabular-nums">{dayLabel(h.date)}</span>
          <span className="min-w-0 flex-1 truncate">{h.name}</span>
          {h.existing ? (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {h.existing.kind === "HOLIDAY" ? "Already added" : `Set as ${DAY_KIND_LABELS[h.existing.kind]}`}
            </span>
          ) : h.tentative ? (
            <span className="shrink-0 text-[11px] text-amber-700 dark:text-amber-400" title="The date may move (moon sighting); check it nearer the time">Date may change</span>
          ) : h.national ? (
            <span className="shrink-0 text-[11px] text-muted-foreground">National</span>
          ) : null}
        </label>
      </li>
    );
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={openDialog}>
        <CalendarPlus className="h-3.5 w-3.5" /> Import Public Holidays
      </Button>
      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-xl">
          <DialogHeader className="border-b border-border/60 px-6 py-4">
            <DialogTitle>Import Public Holidays</DialogTitle>
            <DialogDescription>From Google&apos;s public “Holidays in India” calendar. Tick the days your company gives; check them against your HR list.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-1 border-b border-border/60 px-6 py-2.5">
            {[currentYear, currentYear + 1].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => y !== year && load(y)}
                disabled={loading || saving}
                className={cn("rounded-md px-3 py-1 text-sm font-medium tabular-nums", y === year ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
              >
                {y}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
            {loading || !preview ? (
              <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading {year} holidays…</p>
            ) : preview.holidays.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No holidays listed for {year} yet.</p>
            ) : (
              <>
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Public holidays <span className="font-normal text-muted-foreground">· {publicRows.length}</span></h3>
                    {addablePublic.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setChosen((prev) => {
                          const next = new Set(prev);
                          for (const h of addablePublic) { if (allPublicOn) next.delete(h.date); else next.add(h.date); }
                          return next;
                        })}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        {allPublicOn ? "Clear all" : "Select all"}
                      </button>
                    )}
                  </div>
                  <ul className="divide-y divide-border/60 rounded-lg border border-border/70">{publicRows.map(row)}</ul>
                </section>

                {observances.length > 0 && (
                  <section className="space-y-2">
                    <button type="button" onClick={() => setShowObservances((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold">
                      <span>Festivals and observances <span className="font-normal text-muted-foreground">· {observances.length}</span></span>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showObservances && "rotate-180")} />
                    </button>
                    {showObservances && <ul className="divide-y divide-border/60 rounded-lg border border-border/70">{observances.map(row)}</ul>}
                    {!showObservances && <p className="text-xs text-muted-foreground">Not usually days off, but some companies give a few (e.g. Raksha Bandhan, Chhath).</p>}
                  </section>
                )}
              </>
            )}
          </div>

          <DialogFooter className="m-0 items-center rounded-b-xl border-t border-border/60 px-6 py-3 sm:justify-between">
            <p className="text-xs text-muted-foreground tabular-nums">{chosen.size} selected</p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="button" onClick={save} disabled={saving || loading || chosen.size === 0}>{saving ? "Adding…" : `Add ${chosen.size} Holiday${chosen.size === 1 ? "" : "s"}`}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
