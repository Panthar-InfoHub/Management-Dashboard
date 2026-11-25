"use client";
import { TimePicker } from "@/components/ui/time-picker";

import { useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOfficeAction } from "@/lib/actions/attendance-settings.actions";
import { WEEKDAYS, type DayKindValue } from "@/lib/attendance/calendar";
import type { OfficeSettings } from "@/lib/attendance/settings";
import { errorMessage } from "@/lib/utils";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PickedPlace } from "@/components/settings/office-map";

// Leaflet touches `window`; the map loads only when the picker opens.
const OfficeMap = dynamic(() => import("@/components/settings/office-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[470px] w-full rounded-lg" />,
});

const WEEK_OPTIONS: { value: DayKindValue; label: string }[] = [
  { value: "OFFICE", label: "Office" },
  { value: "WFH", label: "WFH" },
  { value: "OFF", label: "Off" },
];

export function OfficeTab({ office }: { office: OfficeSettings }) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: office.name,
    address: office.address ?? "",
    latitude: String(office.latitude),
    longitude: String(office.longitude),
    radiusMeters: String(office.radiusMeters),
    workStart: office.workStart,
    workEnd: office.workEnd,
    lateAfter: office.lateAfter,
    lateOutcome: office.lateOutcome as "HALF_DAY" | "LATE",
    minFullDayHours: office.minFullDayMinutes == null ? "" : String(office.minFullDayMinutes / 60),
    weekPattern: office.weekPattern as DayKindValue[],
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<PickedPlace | null>(null);

  const applyPicked = () => {
    if (picked) {
      setForm((f) => ({
        ...f,
        latitude: String(picked.lat),
        longitude: String(picked.lng),
        // A searched place also fills the address, if it was empty.
        address: picked.label && !f.address.trim() ? picked.label : f.address,
      }));
    }
    setPickerOpen(false);
  };

  const save = () => {
    startTransition(async () => {
      try {
        await updateOfficeAction(office.id, {
          name: form.name,
          address: form.address,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          radiusMeters: Number(form.radiusMeters),
          workStart: form.workStart,
          workEnd: form.workEnd,
          lateAfter: form.lateAfter,
          lateOutcome: form.lateOutcome,
          minFullDayMinutes: form.minFullDayHours.trim() === "" ? null : Math.round(Number(form.minFullDayHours) * 60),
          weekPattern: form.weekPattern,
        });
        toast.success("Office settings saved");
      } catch (err) {
        toast.error(errorMessage(err, "Office settings not saved. Try again."));
      }
    });
  };

  const field = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
    disabled: isPending,
  });

  return (
    <div className="max-w-3xl space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Location</h3>
          <p className="text-xs text-muted-foreground">Clock-in on an office day must be within the radius of this point.</p>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-border/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm">{form.address || "No address yet"}</p>
              <p className="font-mono text-xs text-muted-foreground tabular-nums">{Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)} · {form.radiusMeters} m radius</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => { setPicked(null); setPickerOpen(true); }} disabled={isPending}>
            Change Location on Map
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="office-name" className="text-xs font-semibold text-muted-foreground">Office Name</label>
            <Input id="office-name" {...field("name")} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="office-address" className="text-xs font-semibold text-muted-foreground">Address</label>
            <Input id="office-address" {...field("address")} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="office-radius" className="text-xs font-semibold text-muted-foreground">Radius (metres)</label>
            <Input id="office-radius" type="number" min={20} max={5000} {...field("radiusMeters")} />
          </div>
        </div>

        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader><DialogTitle>Office Location</DialogTitle></DialogHeader>
            {pickerOpen && (
              <OfficeMap
                initial={{ lat: Number(form.latitude), lng: Number(form.longitude) }}
                radiusMeters={Number(form.radiusMeters)}
                onChange={setPicked}
              />
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPickerOpen(false)}>Cancel</Button>
              <Button type="button" onClick={applyPicked} disabled={!picked}>Use This Location</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Office Hours and Rules</h3>
          <p className="text-xs text-muted-foreground">
            Time before office start and after office end counts as overtime; clocking out before office end is flagged as left early. A clock-in with no clock-out by midnight closes as a missed checkout.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="office-start" className="text-xs font-semibold text-muted-foreground">Office Start</label>
            <TimePicker id="office-start" value={form.workStart} onChange={(v) => setForm((f) => ({ ...f, workStart: v }))} disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="office-end" className="text-xs font-semibold text-muted-foreground">Office End</label>
            <TimePicker id="office-end" value={form.workEnd} onChange={(v) => setForm((f) => ({ ...f, workEnd: v }))} disabled={isPending} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="office-late" className="text-xs font-semibold text-muted-foreground">Late After</label>
            <TimePicker id="office-late" value={form.lateAfter} onChange={(v) => setForm((f) => ({ ...f, lateAfter: v }))} disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Late Clock-In Counts As</label>
            <Select value={form.lateOutcome} onValueChange={(v) => setForm((f) => ({ ...f, lateOutcome: v as "HALF_DAY" | "LATE" }))} disabled={isPending}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HALF_DAY">Half Day</SelectItem>
                <SelectItem value="LATE">Late (full day)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="office-minhours" className="text-xs font-semibold text-muted-foreground">Half Day If Worked Under (hours)</label>
            <Input id="office-minhours" inputMode="decimal" placeholder="Off" {...field("minFullDayHours")} />
            <p className="text-[11px] text-muted-foreground">Office days only. Leave empty to turn off.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Working Week</h3>
          <p className="text-xs text-muted-foreground">The default for each weekday. Change a single date in the Calendar tab.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          {WEEKDAYS.map((day, i) => (
            <div key={day} className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">{day}</span>
              <Select
                value={form.weekPattern[i]}
                onValueChange={(v) => setForm((f) => ({ ...f, weekPattern: f.weekPattern.map((d, j) => (j === i ? (v as DayKindValue) : d)) }))}
                disabled={isPending}
              >
                <SelectTrigger aria-label={`${day} default`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEK_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end border-t border-border/40 pt-4">
        <Button onClick={save} disabled={isPending}>{isPending ? "Saving…" : "Save Office Settings"}</Button>
      </div>
    </div>
  );
}
