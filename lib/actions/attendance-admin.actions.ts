"use server";
import { UserError } from "@/lib/errors";

// Admins and HR (attendance:edit) set any past or current day for someone:
// status and, optionally, the times. Always with a reason; never your own day.
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";
import { canActOnEmployee, tracksAttendance } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { fromDateKey, minutesOfDay, parseHHmm, todayKey, zonedDateTime } from "@/lib/attendance/calendar";
import { checkoutFlags, workedMinutes, EDITABLE_STATUSES, type EditableStatus } from "@/lib/attendance/rules";
import { dayKindsBetween, getOfficeFor } from "@/lib/attendance/queries";
import { getCoverage } from "@/lib/leave/queries";

export async function editAttendanceDayAction(input: {
  employeeId: string;
  date: string;
  status: EditableStatus;
  checkIn?: string | null; // "HH:mm"
  checkOut?: string | null;
  reason: string;
}) {
  const actor = await getCurrentEmployee();
  if (!(await hasPermission(actor, "attendance:edit"))) throw new UserError("You don't have permission to edit attendance.");
  if (input.employeeId === actor.id) throw new UserError("You can't edit your own attendance. Ask another admin, or send an attendance fix.");

  const target = await db.employee.findUnique({ where: { id: input.employeeId }, select: { role: true, firstName: true, lastName: true } });
  if (!target) throw new UserError("Employee not found.");
  if (!tracksAttendance(target.role)) throw new UserError("Super Admins aren't tracked.");
  if (!canActOnEmployee(actor.role, target.role)) throw new UserError("Only Super Admins can edit an Admin's attendance.");

  if (!EDITABLE_STATUSES.includes(input.status)) throw new UserError("Choose Present, Late, Half Day, WFH or Absent.");
  const reason = input.reason?.trim() ?? "";
  if (reason.length < 3) throw new UserError("Add a short reason; the person sees it.");

  const office = await getOfficeFor(input.employeeId);
  const today = todayKey(office.timezone);
  const date = fromDateKey(input.date);
  if (input.date > today) throw new UserError("You can only edit today or an earlier day.");

  // Leave is changed through leave requests, not here.
  const cover = (await getCoverage([input.employeeId], input.date, input.date)).get(input.employeeId)?.get(input.date);
  if (cover?.kind === "LEAVE" && !cover.halfDay) throw new UserError("That day is approved leave. Cancel the leave first to record attendance.");

  const absent = input.status === "ABSENT";
  const checkIn = !absent && input.checkIn ? zonedDateTime(input.date, input.checkIn, office.timezone) : null;
  const checkOut = !absent && input.checkOut ? zonedDateTime(input.date, input.checkOut, office.timezone) : null;
  if (checkOut && !checkIn) throw new UserError("Add the clock-in time too.");
  if (checkIn && checkOut && checkOut <= checkIn) throw new UserError("Clock-out must be after clock-in.");

  const baseKind = (await dayKindsBetween(office, input.date, input.date))[0].dayKind;
  const dayKind = input.status === "WFH" && baseKind === "OFFICE" ? "WFH" : cover?.kind === "WFH" && baseKind === "OFFICE" ? "WFH" : baseKind;

  const minutes = checkIn && checkOut ? workedMinutes(checkIn, checkOut) : null;
  const flags = checkIn && checkOut && minutes !== null
    ? checkoutFlags({
        dayKind,
        checkInMinutes: minutesOfDay(office.timezone, checkIn),
        checkOutMinutes: minutesOfDay(office.timezone, checkOut),
        workStartMinutes: parseHHmm(office.workStart),
        workEndMinutes: parseHHmm(office.workEnd),
        workMinutes: minutes,
      })
    : { leftEarly: false, earlyMinutes: null, overtimeMinutes: null };
  const arrivedLate = checkIn ? minutesOfDay(office.timezone, checkIn) > parseHHmm(office.lateAfter) : false;

  const before = await db.attendance.findUnique({ where: { employeeId_date: { employeeId: input.employeeId, date } } });
  const data = {
    officeId: office.id,
    dayKind,
    status: input.status,
    isLate: input.status === "LATE" || (input.status === "HALF_DAY" && arrivedLate),
    checkInAt: checkIn,
    checkOutAt: checkOut,
    workMinutes: minutes,
    // Set by an admin: no review needed, and an open clock-in on a past day is a missed checkout.
    missedCheckout: !!checkIn && !checkOut && input.date < today,
    ...flags,
    reviewStatus: null,
    reviewedById: actor.id,
    reviewedAt: new Date(),
    note: `Edited by ${actor.firstName} ${actor.lastName}: ${reason}`.slice(0, 500),
  };
  const record = await db.attendance.upsert({
    where: { employeeId_date: { employeeId: input.employeeId, date } },
    create: { ...data, employeeId: input.employeeId, date },
    update: data,
  });
  await db.attendanceEvent.create({
    data: { attendanceId: record.id, employeeId: input.employeeId, type: "ADMIN_FIX", at: new Date(), actorId: actor.id, note: reason.slice(0, 500) },
  });

  const day = date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  await db.notification.create({
    data: {
      recipientId: input.employeeId,
      type: "ATTENDANCE_EDIT",
      title: "Attendance updated",
      message: `${actor.firstName} ${actor.lastName} set ${day} to ${input.status.replace("_", " ").toLowerCase()}: ${reason}`,
      actionUrl: `/attendance?month=${input.date.slice(0, 7)}`,
    },
  });
  audit({
    actorId: actor.id, entity: "Attendance", entityId: record.id, action: "edit",
    changes: JSON.parse(JSON.stringify({ date: input.date, before: before ? { status: before.status, checkInAt: before.checkInAt, checkOutAt: before.checkOutAt } : null, after: { status: input.status, checkIn: input.checkIn, checkOut: input.checkOut }, reason })),
  });

  revalidatePath("/attendance");
  revalidatePath("/attendance/team");
  revalidatePath("/attendance/today");
  revalidatePath("/approvals");
  revalidatePath("/");
  return { success: true, name: `${target.firstName} ${target.lastName}`, day };
}
