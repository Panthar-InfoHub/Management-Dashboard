"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentEmployee, requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/access";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { fromDateKey, parseHHmm, type DayKindValue, type WeekPattern } from "@/lib/attendance/calendar";
import { audit } from "@/lib/audit";

const DAY_KINDS: DayKindValue[] = ["OFFICE", "WFH", "OFF", "HOLIDAY"];

function done(tag: string) {
  updateTag(tag);
  revalidatePath("/settings");
}

// ─── Office (Admins only) ───

export async function updateOfficeAction(officeId: string, data: {
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  lateAfter: string;
  lateOutcome: "HALF_DAY" | "LATE";
  weekPattern: WeekPattern;
}) {
  const actor = await getCurrentEmployee();
  if (!isAdminRole(actor.role)) throw new Error("Only Admins can change office settings.");

  const name = data.name?.trim();
  if (!name) throw new Error("Office name is required.");
  if (!Number.isFinite(data.latitude) || Math.abs(data.latitude) > 90) throw new Error("Latitude must be between -90 and 90.");
  if (!Number.isFinite(data.longitude) || Math.abs(data.longitude) > 180) throw new Error("Longitude must be between -180 and 180.");
  if (!Number.isInteger(data.radiusMeters) || data.radiusMeters < 20 || data.radiusMeters > 5000) {
    throw new Error("Radius must be a whole number between 20 and 5000 metres.");
  }
  parseHHmm(data.lateAfter);
  if (data.lateOutcome !== "HALF_DAY" && data.lateOutcome !== "LATE") throw new Error("Late outcome must be Half Day or Late.");
  if (data.weekPattern.length !== 7 || data.weekPattern.some((d) => !["OFFICE", "WFH", "OFF"].includes(d))) {
    throw new Error("Each weekday must be Office, WFH or Off.");
  }

  const before = await db.office.findUnique({ where: { id: officeId } });
  if (!before) throw new Error("Office not found.");

  const office = await db.office.update({
    where: { id: officeId },
    data: {
      name,
      address: data.address?.trim() || null,
      latitude: data.latitude,
      longitude: data.longitude,
      radiusMeters: data.radiusMeters,
      lateAfter: data.lateAfter,
      lateOutcome: data.lateOutcome,
      weekPattern: data.weekPattern,
    },
  });

  audit({
    actorId: actor.id, entity: "Office", entityId: officeId, action: "update",
    changes: JSON.parse(JSON.stringify({ before: { lateAfter: before.lateAfter, lateOutcome: before.lateOutcome, weekPattern: before.weekPattern, radiusMeters: before.radiusMeters }, after: data })),
  });
  done(CACHE_TAGS.offices);
  return office;
}

// ─── Calendar days: holidays and one-off overrides (leave:manage) ───

export async function upsertCalendarDayAction(data: { date: string; kind: DayKindValue; name?: string | null }) {
  const actor = await requireAuth("leave:manage");
  if (!DAY_KINDS.includes(data.kind)) throw new Error("Choose Holiday, Office day, WFH or Off.");
  const date = fromDateKey(data.date);
  const name = data.name?.trim() || null;
  if (data.kind === "HOLIDAY" && !name) throw new Error("Give the holiday a name, e.g. Diwali.");

  const existing = await db.calendarDay.findFirst({ where: { date, officeId: null }, select: { id: true } });
  const day = existing
    ? await db.calendarDay.update({ where: { id: existing.id }, data: { kind: data.kind, name } })
    : await db.calendarDay.create({ data: { date, kind: data.kind, name, createdById: actor.id } });

  audit({ actorId: actor.id, entity: "CalendarDay", entityId: day.id, action: existing ? "update" : "create", changes: { date: data.date, kind: data.kind, name } });
  done(CACHE_TAGS.calendar);
  return { success: true };
}

export async function deleteCalendarDayAction(id: string) {
  const actor = await requireAuth("leave:manage");
  const day = await db.calendarDay.findUnique({ where: { id } });
  if (!day) throw new Error("That day was already removed.");
  await db.calendarDay.delete({ where: { id } });

  audit({ actorId: actor.id, entity: "CalendarDay", entityId: id, action: "delete", changes: { date: day.date.toISOString().slice(0, 10), kind: day.kind, name: day.name } });
  done(CACHE_TAGS.calendar);
  return { success: true };
}

// ─── Leave types (leave:manage) ───

type LeaveTypeInput = { name: string; yearlyDays: number | null; carryOverMax: number; isPaid: boolean; isActive: boolean };

function cleanLeaveType(data: LeaveTypeInput) {
  const name = data.name?.trim();
  if (!name) throw new Error("Leave type name is required.");
  const halfStep = (n: number) => Number.isFinite(n) && n >= 0 && n <= 365 && Number.isInteger(n * 2);
  if (data.yearlyDays !== null && !halfStep(data.yearlyDays)) throw new Error("Days per year must be 0–365, in steps of 0.5.");
  if (!halfStep(data.carryOverMax)) throw new Error("Carry-over must be 0–365, in steps of 0.5.");
  if (data.yearlyDays === null && data.carryOverMax > 0) throw new Error("A leave type with no limit can't carry days over.");
  return { name, yearlyDays: data.yearlyDays, carryOverMax: data.carryOverMax, isPaid: !!data.isPaid, isActive: !!data.isActive };
}

export async function createLeaveTypeAction(data: LeaveTypeInput) {
  const actor = await requireAuth("leave:manage");
  const clean = cleanLeaveType(data);
  if (await db.leaveType.findUnique({ where: { name: clean.name }, select: { id: true } })) {
    throw new Error(`A leave type named “${clean.name}” already exists.`);
  }
  const last = await db.leaveType.aggregate({ _max: { sortOrder: true } });
  const type = await db.leaveType.create({ data: { ...clean, sortOrder: (last._max.sortOrder ?? 0) + 1 } });

  audit({ actorId: actor.id, entity: "LeaveType", entityId: type.id, action: "create", changes: clean });
  done(CACHE_TAGS.leaveTypes);
  return type;
}

/** Leave types are never deleted (requests point at them); set isActive false instead. */
export async function updateLeaveTypeAction(id: string, data: LeaveTypeInput) {
  const actor = await requireAuth("leave:manage");
  const clean = cleanLeaveType(data);
  const before = await db.leaveType.findUnique({ where: { id } });
  if (!before) throw new Error("Leave type not found.");
  if (clean.name !== before.name && (await db.leaveType.findUnique({ where: { name: clean.name }, select: { id: true } }))) {
    throw new Error(`A leave type named “${clean.name}” already exists.`);
  }
  const type = await db.leaveType.update({ where: { id }, data: clean });

  audit({ actorId: actor.id, entity: "LeaveType", entityId: id, action: "update", changes: JSON.parse(JSON.stringify({ before, after: clean })) });
  done(CACHE_TAGS.leaveTypes);
  return type;
}
