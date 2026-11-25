"use server";
import { UserError } from "@/lib/errors";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentEmployee, requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/access";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { fromDateKey, parseHHmm, type DayKindValue, type WeekPattern } from "@/lib/attendance/calendar";
import { audit } from "@/lib/audit";
import { recalculateBalances, recomputeRequestDays } from "@/lib/leave/balances";
import { todayKey } from "@/lib/attendance/calendar";

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
  workStart: string;
  workEnd: string;
  lateAfter: string;
  lateOutcome: "HALF_DAY" | "LATE";
  minFullDayMinutes: number | null;
  weekPattern: WeekPattern;
}) {
  const actor = await getCurrentEmployee();
  if (!isAdminRole(actor.role)) throw new UserError("Only Admins can change office settings.");

  const name = data.name?.trim();
  if (!name) throw new UserError("Office name is required.");
  if (!Number.isFinite(data.latitude) || Math.abs(data.latitude) > 90) throw new UserError("Latitude must be between -90 and 90.");
  if (!Number.isFinite(data.longitude) || Math.abs(data.longitude) > 180) throw new UserError("Longitude must be between -180 and 180.");
  if (!Number.isInteger(data.radiusMeters) || data.radiusMeters < 20 || data.radiusMeters > 5000) {
    throw new UserError("Radius must be a whole number between 20 and 5000 metres.");
  }
  const start = parseHHmm(data.workStart), end = parseHHmm(data.workEnd), late = parseHHmm(data.lateAfter);
  if (end <= start) throw new UserError("Office end must be after office start.");
  if (late < start || late >= end) throw new UserError("The late cut-off must be within office hours.");
  if (data.lateOutcome !== "HALF_DAY" && data.lateOutcome !== "LATE") throw new UserError("Late outcome must be Half Day or Late.");
  if (data.minFullDayMinutes !== null && (!Number.isInteger(data.minFullDayMinutes) || data.minFullDayMinutes < 30 || data.minFullDayMinutes > 16 * 60)) {
    throw new UserError("Minimum hours for a full day must be between 0.5 and 16, or empty to turn the rule off.");
  }
  if (data.weekPattern.length !== 7 || data.weekPattern.some((d) => !["OFFICE", "WFH", "OFF"].includes(d))) {
    throw new UserError("Each weekday must be Office, WFH or Off.");
  }

  const before = await db.office.findUnique({ where: { id: officeId } });
  if (!before) throw new UserError("Office not found.");

  const office = await db.office.update({
    where: { id: officeId },
    data: {
      name,
      address: data.address?.trim() || null,
      latitude: data.latitude,
      longitude: data.longitude,
      radiusMeters: data.radiusMeters,
      workStart: data.workStart,
      workEnd: data.workEnd,
      lateAfter: data.lateAfter,
      lateOutcome: data.lateOutcome,
      minFullDayMinutes: data.minFullDayMinutes,
      weekPattern: data.weekPattern,
    },
  });

  audit({
    actorId: actor.id, entity: "Office", entityId: officeId, action: "update",
    changes: JSON.parse(JSON.stringify({ before: { lateAfter: before.lateAfter, lateOutcome: before.lateOutcome, weekPattern: before.weekPattern, radiusMeters: before.radiusMeters }, after: data })),
  });
  done(CACHE_TAGS.offices);
  if (JSON.stringify(before.weekPattern) !== JSON.stringify(data.weekPattern)) {
    const year = Number(todayKey(office.timezone).slice(0, 4));
    await recomputeRequestDays(`${year}-01-01`, `${year + 1}-12-31`);
  }
  return office;
}

// ─── Calendar days: holidays and one-off overrides (leave:manage) ───

export async function upsertCalendarDayAction(data: { date: string; kind: DayKindValue; name?: string | null }) {
  const actor = await requireAuth("leave:manage");
  if (!DAY_KINDS.includes(data.kind)) throw new UserError("Choose Holiday, Office day, WFH or Off.");
  const date = fromDateKey(data.date);
  const name = data.name?.trim() || null;
  if (data.kind === "HOLIDAY" && !name) throw new UserError("Give the holiday a name, e.g. Diwali.");

  const existing = await db.calendarDay.findFirst({ where: { date, officeId: null }, select: { id: true } });
  const day = existing
    ? await db.calendarDay.update({ where: { id: existing.id }, data: { kind: data.kind, name } })
    : await db.calendarDay.create({ data: { date, kind: data.kind, name, createdById: actor.id } });

  audit({ actorId: actor.id, entity: "CalendarDay", entityId: day.id, action: existing ? "update" : "create", changes: { date: data.date, kind: data.kind, name } });
  done(CACHE_TAGS.calendar);
  // A new holiday inside approved or pending leave gives that day back.
  await recomputeRequestDays(data.date, data.date);
  return { success: true };
}

export async function deleteCalendarDayAction(id: string) {
  const actor = await requireAuth("leave:manage");
  const day = await db.calendarDay.findUnique({ where: { id } });
  if (!day) throw new UserError("That day was already removed.");
  await db.calendarDay.delete({ where: { id } });

  audit({ actorId: actor.id, entity: "CalendarDay", entityId: id, action: "delete", changes: { date: day.date.toISOString().slice(0, 10), kind: day.kind, name: day.name } });
  done(CACHE_TAGS.calendar);
  await recomputeRequestDays(day.date.toISOString().slice(0, 10), day.date.toISOString().slice(0, 10));
  return { success: true };
}

// ─── Leave types (leave:manage) ───

type LeaveTypeInput = { name: string; yearlyDays: number | null; carryOverMax: number; isPaid: boolean; isActive: boolean };

function cleanLeaveType(data: LeaveTypeInput) {
  const name = data.name?.trim();
  if (!name) throw new UserError("Leave type name is required.");
  const halfStep = (n: number) => Number.isFinite(n) && n >= 0 && n <= 365 && Number.isInteger(n * 2);
  if (data.yearlyDays !== null && !halfStep(data.yearlyDays)) throw new UserError("Days per year must be 0–365, in steps of 0.5.");
  if (!halfStep(data.carryOverMax)) throw new UserError("Carry-over must be 0–365, in steps of 0.5.");
  if (data.yearlyDays === null && data.carryOverMax > 0) throw new UserError("A leave type with no limit can't carry days over.");
  return { name, yearlyDays: data.yearlyDays, carryOverMax: data.carryOverMax, isPaid: !!data.isPaid, isActive: !!data.isActive };
}

export async function createLeaveTypeAction(data: LeaveTypeInput) {
  const actor = await requireAuth("leave:manage");
  const clean = cleanLeaveType(data);
  if (await db.leaveType.findUnique({ where: { name: clean.name }, select: { id: true } })) {
    throw new UserError(`A leave type named “${clean.name}” already exists.`);
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
  if (!before) throw new UserError("Leave type not found.");
  if (clean.name !== before.name && (await db.leaveType.findUnique({ where: { name: clean.name }, select: { id: true } }))) {
    throw new UserError(`A leave type named “${clean.name}” already exists.`);
  }
  const type = await db.leaveType.update({ where: { id }, data: clean });

  audit({ actorId: actor.id, entity: "LeaveType", entityId: id, action: "update", changes: JSON.parse(JSON.stringify({ before, after: clean })) });
  done(CACHE_TAGS.leaveTypes);
  if (before.yearlyDays !== clean.yearlyDays || before.carryOverMax !== clean.carryOverMax) {
    const year = Number(todayKey("Asia/Kolkata").slice(0, 4));
    await recalculateBalances("ALL", year);
    await recalculateBalances("ALL", year + 1);
  }
  return type;
}
