// Office, calendar and leave-type settings. Shared by every user and changed
// rarely, so cached across requests; the settings actions call updateTag().
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { toDateKey, fromDateKey, type DayKindValue } from "@/lib/attendance/calendar";

export type OfficeSettings = Awaited<ReturnType<typeof getOffices>>[number];

export async function getOffices() {
  "use cache";
  cacheTag(CACHE_TAGS.offices);
  cacheLife("hours");
  return db.office.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true, name: true, address: true, latitude: true, longitude: true, radiusMeters: true,
      timezone: true, lateAfter: true, lateOutcome: true, weekPattern: true, isDefault: true,
    },
  });
}

export async function getDefaultOffice(): Promise<OfficeSettings> {
  const offices = await getOffices();
  const office = offices.find((o) => o.isDefault) ?? offices[0];
  if (!office) throw new Error("No office is set up. Add one in Settings → Office.");
  return office;
}

/** Dated overrides in a range (inclusive), as plain rows with "YYYY-MM-DD" dates. */
export async function getCalendarDays(fromKey: string, toKey: string) {
  "use cache";
  cacheTag(CACHE_TAGS.calendar);
  cacheLife("hours");
  const rows = await db.calendarDay.findMany({
    where: { date: { gte: fromDateKey(fromKey), lte: fromDateKey(toKey) } },
    orderBy: { date: "asc" },
    select: { id: true, date: true, kind: true, name: true, officeId: true },
  });
  return rows.map((r) => ({ ...r, date: toDateKey(r.date), kind: r.kind as DayKindValue }));
}

export async function getLeaveTypes({ includeInactive = false } = {}) {
  "use cache";
  cacheTag(CACHE_TAGS.leaveTypes);
  cacheLife("hours");
  return db.leaveType.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, yearlyDays: true, carryOverMax: true, isPaid: true, isActive: true, sortOrder: true },
  });
}
