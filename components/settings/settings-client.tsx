"use client";

import { Building2, CalendarDays, KeyRound, Plane } from "lucide-react";
import { AccessPresetsTab, type PresetRow } from "@/components/settings/access-presets-tab";
import { OfficeTab } from "@/components/settings/office-tab";
import { CalendarTab } from "@/components/settings/calendar-tab";
import { LeaveTypesTab } from "@/components/settings/leave-types-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OfficeSettings } from "@/lib/attendance/settings";
import type { DayKindValue } from "@/lib/attendance/calendar";

type Props = {
  presets: PresetRow[] | null;
  office: OfficeSettings | null;
  calendarDays: { id: string; date: string; kind: DayKindValue; name: string | null }[] | null;
  /** This year in office time, for the holiday import. */
  currentYear: number;
  leaveTypes: { id: string; name: string; yearlyDays: number | null; isPaid: boolean; isActive: boolean }[] | null;
};

const triggerClass = "gap-2 text-xs h-7";
const contentClass = "m-0 border-0 p-0 focus-visible:outline-none";

/** Each tab shows only for people allowed to use it (null = not allowed). */
export function SettingsClient({ presets, office, calendarDays, leaveTypes, currentYear }: Props) {
  const first = presets ? "access" : office ? "office" : "calendar";
  return (
    <Tabs defaultValue={first} className="flex flex-col gap-6">
      <div className="w-full overflow-x-auto pb-1">
        <TabsList className="w-fit justify-start h-9">
          {presets && <TabsTrigger value="access" className={triggerClass}><KeyRound className="h-3.5 w-3.5" /> Roles & Access</TabsTrigger>}
          {office && <TabsTrigger value="office" className={triggerClass}><Building2 className="h-3.5 w-3.5" /> Office</TabsTrigger>}
          {calendarDays && <TabsTrigger value="calendar" className={triggerClass}><CalendarDays className="h-3.5 w-3.5" /> Calendar</TabsTrigger>}
          {leaveTypes && <TabsTrigger value="leave-types" className={triggerClass}><Plane className="h-3.5 w-3.5" /> Leave Types</TabsTrigger>}
        </TabsList>
      </div>

      <div className="flex-1 min-w-0 pb-10">
        {presets && <TabsContent value="access" className={contentClass}><AccessPresetsTab presets={presets} /></TabsContent>}
        {office && <TabsContent value="office" className={contentClass}><OfficeTab office={office} /></TabsContent>}
        {calendarDays && <TabsContent value="calendar" className={contentClass}><CalendarTab days={calendarDays} currentYear={currentYear} /></TabsContent>}
        {leaveTypes && <TabsContent value="leave-types" className={contentClass}><LeaveTypesTab types={leaveTypes} /></TabsContent>}
      </div>
    </Tabs>
  );
}
