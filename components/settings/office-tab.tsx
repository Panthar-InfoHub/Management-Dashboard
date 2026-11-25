"use client";

import { useState, useTransition } from "react";
import { LocateFixed } from "lucide-react";
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

// Leaflet touches `window`, so the map renders in the browser only.
const OfficeMap = dynamic(() => import("@/components/settings/office-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[320px] w-full rounded-lg" />,
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

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) return toast.error("This browser can't share location.");
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })),
      () => toast.error("Location not shared. Allow location access and try again."),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
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
          <p className="text-xs text-muted-foreground">Click the map or drag the pin to set the office. Clock-in on an office day must be inside the circle.</p>
        </div>
        <OfficeMap
          lat={Number(form.latitude)}
          lng={Number(form.longitude)}
          radiusMeters={Number(form.radiusMeters)}
          onChange={(p) => setForm((f) => ({ ...f, latitude: String(p.lat), longitude: String(p.lng) }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="office-name" className="text-xs font-semibold text-muted-foreground">Office Name</label>
            <Input id="office-name" {...field("name")} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="office-address" className="text-xs font-semibold text-muted-foreground">Address</label>
            <Input id="office-address" {...field("address")} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="office-lat" className="text-xs font-semibold text-muted-foreground">Latitude</label>
            <Input id="office-lat" inputMode="decimal" className="font-mono" {...field("latitude")} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="office-lng" className="text-xs font-semibold text-muted-foreground">Longitude</label>
            <Input id="office-lng" inputMode="decimal" className="font-mono" {...field("longitude")} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="office-radius" className="text-xs font-semibold text-muted-foreground">Radius (metres)</label>
            <Input id="office-radius" type="number" min={20} max={5000} {...field("radiusMeters")} />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={useMyLocation} disabled={isPending}>
              <LocateFixed className="h-3.5 w-3.5" /> Use My Location
            </Button>
          </div>
        </div>
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
            <Input id="office-start" type="time" {...field("workStart")} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="office-end" className="text-xs font-semibold text-muted-foreground">Office End</label>
            <Input id="office-end" type="time" {...field("workEnd")} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="office-late" className="text-xs font-semibold text-muted-foreground">Late After</label>
            <Input id="office-late" type="time" {...field("lateAfter")} />
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
