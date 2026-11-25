"use server";

// Leave, WFH and attendance-fix requests, and their approval. Nobody decides
// their own request; every decision stores who, when and an optional note.
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentEmployee, type AuthEmployee } from "@/lib/auth";
import { canActOnEmployee, tracksAttendance } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { dayKindsBetween, getOfficeFor } from "@/lib/attendance/queries";
import { eachDateKey, fromDateKey, minutesOfDay, parseHHmm, todayKey, zonedDateTime } from "@/lib/attendance/calendar";
import { checkoutFlags, statusForDay, workedMinutes } from "@/lib/attendance/rules";
import { availableDays, requestDays, MAX_REQUEST_SPAN_DAYS, REQUEST_KIND_LABELS, type RequestKindValue } from "@/lib/leave/rules";
import { canDecideFor, ensureBalances, getCoverage } from "@/lib/leave/queries";
import { leaveYearOf } from "@/lib/leave/policy";
import { leadsOf } from "@/lib/teams/membership";

type SubmitInput = {
  kind: RequestKindValue;
  leaveTypeId?: string | null;
  startDate: string;
  endDate: string;
  halfDay?: "FIRST_HALF" | "SECOND_HALF" | null;
  reason: string;
  fixCheckIn?: string | null; // "HH:mm", attendance fix only
  fixCheckOut?: string | null;
  workMode?: "OFFICE" | "WFH" | null; // attendance fix only: where they worked
};

const FIX_LOOKBACK_DAYS = 31;

function refresh() {
  revalidatePath("/leave");
  revalidatePath("/approvals");
  revalidatePath("/attendance");
  revalidatePath("/attendance/today");
  revalidatePath("/");
}

function rangeLabel(start: string, end: string) {
  const f = (k: string) => fromDateKey(k).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  return start === end ? f(start) : `${f(start)}–${f(end)}`;
}

/** Leads of every team they're in, plus HR-style approvers (leave:approve); admins if nobody else. Never the requester. */
async function findApprovers(requesterId: string): Promise<string[]> {
  const lead = await leadsOf(requesterId);

  const granted = await db.employee.findMany({
    where: {
      status: "ACTIVE",
      id: { not: requesterId },
      role: "MEMBER",
      OR: [
        { accessPresets: { some: { preset: { permissions: { has: "leave:approve" } } } } },
        { employeePermissions: { some: { permission: "leave:approve", projectId: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } } },
      ],
    },
    select: { id: true },
  });

  let ids = [...new Set([...lead, ...granted.map((g) => g.id)])];
  if (ids.length === 0) {
    const admins = await db.employee.findMany({ where: { status: "ACTIVE", role: { in: ["ADMIN", "SUPER_ADMIN"] }, id: { not: requesterId } }, select: { id: true } });
    ids = admins.map((a) => a.id);
  }
  return ids;
}

async function notify(recipientIds: string[], title: string, message: string, actionUrl: string) {
  if (recipientIds.length === 0) return;
  await db.notification.createMany({
    data: recipientIds.map((recipientId) => ({ recipientId, type: "REQUEST", title, message, actionUrl })),
  });
}

async function requireTracked(): Promise<AuthEmployee> {
  const employee = await getCurrentEmployee();
  if (!tracksAttendance(employee.role)) throw new Error("Super Admins don't use leave or attendance requests.");
  return employee;
}

// ─── Submit ───

export async function submitRequestAction(input: SubmitInput) {
  const employee = await requireTracked();
  const office = await getOfficeFor(employee.id);
  const today = todayKey(office.timezone);

  const reason = input.reason?.trim() ?? "";
  if (reason.length < 3) throw new Error("Add a short reason.");
  if (reason.length > 1000) throw new Error("Keep the reason under 1000 characters.");

  const start = input.startDate, end = input.kind === "ATTENDANCE_FIX" ? input.startDate : input.endDate || input.startDate;
  fromDateKey(start); fromDateKey(end);
  if (end < start) throw new Error("The end date is before the start date.");
  const span = eachDateKey(start, end).length;
  if (span > MAX_REQUEST_SPAN_DAYS) throw new Error(`A request can cover at most ${MAX_REQUEST_SPAN_DAYS} days. Split it into two.`);

  const days = await dayKindsBetween(office, start, end);
  const halfDay = input.kind === "LEAVE" ? input.halfDay ?? null : null;
  if (halfDay && start !== end) throw new Error("A half day must be a single date.");

  let leaveTypeId: string | null = null;
  let fixCheckIn: Date | null = null, fixCheckOut: Date | null = null;
  let workMode: "OFFICE" | "WFH" | null = null;
  const count = requestDays(input.kind, days, !!halfDay);

  if (input.kind === "LEAVE") {
    const type = input.leaveTypeId ? await db.leaveType.findUnique({ where: { id: input.leaveTypeId } }) : null;
    if (!type || !type.isActive) throw new Error("Choose a leave type.");
    leaveTypeId = type.id;
    if (leaveYearOf(start) !== leaveYearOf(end)) throw new Error("Leave can't cross into the next year. Split it at 31 December.");
    if (count === 0) throw new Error("Those dates are all days off or holidays, so there's nothing to take.");
    if (type.yearlyDays !== null) {
      const year = leaveYearOf(start);
      await ensureBalances(employee.id, year);
      const [balance, pending] = await Promise.all([
        db.leaveBalance.findUnique({ where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: type.id, year } } }),
        db.request.aggregate({
          where: { employeeId: employee.id, leaveTypeId: type.id, kind: "LEAVE", status: "PENDING", startDate: { gte: fromDateKey(`${year}-01-01`), lte: fromDateKey(`${year}-12-31`) } },
          _sum: { days: true },
        }),
      ]);
      const left = balance ? availableDays(balance, pending._sum.days ?? 0) : 0;
      if (count > left) {
        throw new Error(`You have ${left} ${type.name} day${left === 1 ? "" : "s"} left (pending requests included), and this needs ${count}. Choose Unpaid Leave or fewer days.`);
      }
    }
  } else if (input.kind === "WFH") {
    if (count === 0) throw new Error("Those dates have no office days, so there's nothing to work from home.");
  } else if (input.kind === "ATTENDANCE_FIX") {
    if (start > today) throw new Error("You can only fix today or an earlier day.");
    const oldest = eachDateKey(start, today).length - 1;
    if (oldest > FIX_LOOKBACK_DAYS) throw new Error(`Attendance can be fixed for the last ${FIX_LOOKBACK_DAYS} days only.`);
    if (!input.fixCheckIn || !input.fixCheckOut) throw new Error("Enter both the clock-in and clock-out times.");
    if (parseHHmm(input.fixCheckOut) <= parseHHmm(input.fixCheckIn)) throw new Error("Clock-out must be after clock-in.");
    workMode = input.workMode === "WFH" ? "WFH" : "OFFICE";
    fixCheckIn = zonedDateTime(start, input.fixCheckIn, office.timezone);
    fixCheckOut = zonedDateTime(start, input.fixCheckOut, office.timezone);
  } else {
    throw new Error("Unknown request type.");
  }

  // No overlapping open requests: leave/WFH block each other; fixes are per date.
  const overlap = await db.request.findFirst({
    where: {
      employeeId: employee.id,
      status: { in: ["PENDING", "APPROVED"] },
      kind: input.kind === "ATTENDANCE_FIX" ? "ATTENDANCE_FIX" : { in: ["LEAVE", "WFH"] },
      startDate: { lte: fromDateKey(end) },
      endDate: { gte: fromDateKey(start) },
    },
    select: { kind: true, startDate: true, endDate: true, status: true },
  });
  if (overlap) {
    throw new Error(`You already have a ${overlap.status.toLowerCase()} ${REQUEST_KIND_LABELS[overlap.kind as RequestKindValue].toLowerCase()} request covering ${rangeLabel(overlap.startDate.toISOString().slice(0, 10), overlap.endDate.toISOString().slice(0, 10))}. Cancel it first.`);
  }

  const request = await db.request.create({
    data: {
      employeeId: employee.id, kind: input.kind, leaveTypeId, startDate: fromDateKey(start), endDate: fromDateKey(end),
      halfDay, days: count, reason, fixCheckIn, fixCheckOut, workMode,
    },
  });

  const approvers = await findApprovers(employee.id);
  await notify(approvers, `${REQUEST_KIND_LABELS[input.kind]} request`, `${employee.firstName} ${employee.lastName} asked for ${REQUEST_KIND_LABELS[input.kind].toLowerCase()} on ${rangeLabel(start, end)}.`, "/approvals");
  audit({ actorId: employee.id, entity: "Request", entityId: request.id, action: "create", changes: { kind: input.kind, start, end, days: count, halfDay } });
  refresh();
  return { success: true, id: request.id, days: count };
}

// ─── Cancel (requester) ───

export async function cancelRequestAction(requestId: string) {
  const employee = await getCurrentEmployee();
  const request = await db.request.findUnique({ where: { id: requestId } });
  if (!request || request.employeeId !== employee.id) throw new Error("Request not found.");

  const office = await getOfficeFor(employee.id);
  const today = todayKey(office.timezone);
  const startKey = request.startDate.toISOString().slice(0, 10);
  const cancellable = request.status === "PENDING" || (request.status === "APPROVED" && startKey > today);
  if (!cancellable) throw new Error("Only pending requests, or approved ones that haven't started, can be cancelled.");

  await db.$transaction(async (tx) => {
    const updated = await tx.request.updateMany({ where: { id: requestId, status: request.status }, data: { status: "CANCELLED" } });
    if (updated.count === 0) throw new Error("This request just changed. Reload and try again.");
    // Approved leave gives its days back.
    if (request.status === "APPROVED" && request.kind === "LEAVE" && request.leaveTypeId) {
      await tx.leaveBalance.updateMany({
        where: { employeeId: employee.id, leaveTypeId: request.leaveTypeId, year: leaveYearOf(startKey) },
        data: { used: { decrement: request.days } },
      });
    }
  });

  audit({ actorId: employee.id, entity: "Request", entityId: requestId, action: "cancel", changes: { from: request.status } });
  refresh();
  return { success: true };
}

// ─── Decide (approver) ───

/** Write an approved attendance fix onto the day. */
async function applyAttendanceFix(request: { employeeId: string; startDate: Date; fixCheckIn: Date | null; fixCheckOut: Date | null; reason: string; workMode: string | null }, actorId: string) {
  if (!request.fixCheckIn || !request.fixCheckOut) throw new Error("This fix has no times.");
  const office = await getOfficeFor(request.employeeId);
  const dateKey = request.startDate.toISOString().slice(0, 10);
  const coverage = (await getCoverage([request.employeeId], dateKey, dateKey)).get(request.employeeId)?.get(dateKey);
  const baseKind = (await dayKindsBetween(office, dateKey, dateKey))[0].dayKind;
  // Worked from home on an office day (said in the fix, or an approved WFH) → a WFH day.
  const fromHome = request.workMode === "WFH" || coverage?.kind === "WFH";
  const dayKind = fromHome && baseKind === "OFFICE" ? "WFH" : baseKind;

  const minutes = workedMinutes(request.fixCheckIn, request.fixCheckOut);
  const inMin = minutesOfDay(office.timezone, request.fixCheckIn), outMin = minutesOfDay(office.timezone, request.fixCheckOut);
  const outcome = statusForDay({
    dayKind, checkInMinutes: inMin, workMinutes: minutes,
    lateAfterMinutes: parseHHmm(office.lateAfter), lateOutcome: office.lateOutcome, minFullDayMinutes: office.minFullDayMinutes,
  });
  const flags = checkoutFlags({
    dayKind, checkInMinutes: inMin, checkOutMinutes: outMin,
    workStartMinutes: parseHHmm(office.workStart), workEndMinutes: parseHHmm(office.workEnd), workMinutes: minutes,
  });
  const data = {
    officeId: office.id, dayKind, status: outcome.status, isLate: outcome.isLate,
    // The approver has just reviewed this day, so a half day needs no second review.
    reviewStatus: outcome.needsReview ? ("APPROVED" as const) : null, reviewedById: actorId, reviewedAt: new Date(),
    checkInAt: request.fixCheckIn, checkOutAt: request.fixCheckOut, workMinutes: minutes, missedCheckout: false, ...flags,
    note: `Fixed by request: ${request.reason}`.slice(0, 500),
  };
  const record = await db.attendance.upsert({
    where: { employeeId_date: { employeeId: request.employeeId, date: request.startDate } },
    create: { ...data, employeeId: request.employeeId, date: request.startDate },
    update: data,
  });
  await db.attendanceEvent.create({
    data: { attendanceId: record.id, employeeId: request.employeeId, type: "ADMIN_FIX", at: new Date(), actorId, note: "Attendance fix approved" },
  });
}

export async function decideRequestAction(requestId: string, decision: "APPROVE" | "REJECT", note?: string | null) {
  const actor = await getCurrentEmployee();
  const request = await db.request.findUnique({ where: { id: requestId }, include: { leaveType: true } });
  if (!request) throw new Error("Request not found.");
  if (request.employeeId === actor.id) throw new Error("You can't decide your own request.");
  if (!(await canDecideFor(actor, request.employeeId))) throw new Error("You can't decide requests for this person.");
  if (request.status !== "PENDING") throw new Error(`This request is already ${request.status.toLowerCase()}.`);
  const decisionNote = note?.trim().slice(0, 500) || null;
  const startKey = request.startDate.toISOString().slice(0, 10);

  if (decision === "APPROVE" && request.kind === "LEAVE" && request.leaveType?.yearlyDays != null) {
    const year = leaveYearOf(startKey);
    await ensureBalances(request.employeeId, year);
  }

  await db.$transaction(async (tx) => {
    // Guarded update: only one approver can move it out of PENDING.
    const updated = await tx.request.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED", decidedById: actor.id, decidedAt: new Date(), decisionNote },
    });
    if (updated.count === 0) throw new Error("Someone else just decided this request.");

    if (decision === "APPROVE" && request.kind === "LEAVE" && request.leaveTypeId && request.leaveType?.yearlyDays != null) {
      const year = leaveYearOf(startKey);
      const balance = await tx.leaveBalance.findUnique({ where: { employeeId_leaveTypeId_year: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year } } });
      const otherPending = await tx.request.aggregate({
        where: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, kind: "LEAVE", status: "PENDING", id: { not: requestId }, startDate: { gte: fromDateKey(`${year}-01-01`), lte: fromDateKey(`${year}-12-31`) } },
        _sum: { days: true },
      });
      const left = balance ? availableDays(balance, otherPending._sum.days ?? 0) : 0;
      if (request.days > left) throw new Error(`Not enough ${request.leaveType.name} left (${left} days). Reject it, or ask them to choose Unpaid Leave.`);
      await tx.leaveBalance.update({ where: { id: balance!.id }, data: { used: { increment: request.days } } });
    }
  });

  if (decision === "APPROVE" && request.kind === "ATTENDANCE_FIX") {
    await applyAttendanceFix(request, actor.id);
  }

  const verb = decision === "APPROVE" ? "approved" : "rejected";
  await notify(
    [request.employeeId],
    `${REQUEST_KIND_LABELS[request.kind as RequestKindValue]} ${verb}`,
    `${actor.firstName} ${actor.lastName} ${verb} your request for ${rangeLabel(startKey, request.endDate.toISOString().slice(0, 10))}${decisionNote ? `: ${decisionNote}` : "."}`,
    "/leave"
  );
  audit({ actorId: actor.id, entity: "Request", entityId: requestId, action: verb, changes: { note: decisionNote } });
  refresh();
  return { success: true };
}

// ─── Late half-day review ───

/**
 * A day marked Half Day (late clock-in, or under the minimum hours) waits for an
 * approver: keep it as a half day, or make it a full day. A full day stays
 * flagged Late if they arrived late, otherwise it becomes Present.
 */
export async function reviewAttendanceAction(attendanceId: string, decision: "KEEP_HALF_DAY" | "MAKE_FULL_DAY", note?: string | null) {
  const actor = await getCurrentEmployee();
  const record = await db.attendance.findUnique({ where: { id: attendanceId }, select: { id: true, employeeId: true, date: true, isLate: true, reviewStatus: true } });
  if (!record || record.reviewStatus !== "PENDING") throw new Error("This day is no longer waiting for review.");
  if (record.employeeId === actor.id) throw new Error("You can't review your own attendance.");
  if (!(await canDecideFor(actor, record.employeeId))) throw new Error("You can't review attendance for this person.");

  const excused = decision === "MAKE_FULL_DAY";
  const updated = await db.attendance.updateMany({
    where: { id: attendanceId, reviewStatus: "PENDING" },
    data: {
      reviewStatus: excused ? "REJECTED" : "APPROVED",
      reviewedById: actor.id,
      reviewedAt: new Date(),
      ...(excused && { status: record.isLate ? "LATE" : "PRESENT" }),
      ...(note?.trim() && { note: note.trim().slice(0, 500) }),
    },
  });
  if (updated.count === 0) throw new Error("Someone else just reviewed this day.");

  await db.attendanceEvent.create({
    data: { attendanceId, employeeId: record.employeeId, type: "REVIEW", at: new Date(), actorId: actor.id, note: excused ? "Made a full day" : "Kept as half day" },
  });
  const dateKey = record.date.toISOString().slice(0, 10);
  await notify(
    [record.employeeId],
    excused ? "Counted as a full day" : "Half day confirmed",
    `${actor.firstName} ${actor.lastName} ${excused ? "counted it as a full day" : "kept it as a half day"} on ${rangeLabel(dateKey, dateKey)}${note?.trim() ? `: ${note.trim()}` : "."}`,
    "/attendance"
  );
  audit({ actorId: actor.id, entity: "Attendance", entityId: attendanceId, action: excused ? "make-full-day" : "keep-half-day", changes: { note: note ?? null } });
  refresh();
  return { success: true };
}

// ─── Balance adjustment (HR) ───

/** Add or remove days from someone's balance, with a reason (leave:manage). */
export async function adjustBalanceAction(input: { employeeId: string; leaveTypeId: string; year: number; delta: number; note: string }) {
  const actor = await getCurrentEmployee();
  if (!(await hasPermission(actor, "leave:manage"))) throw new Error("You don't have permission to adjust leave balances.");
  if (input.employeeId === actor.id) throw new Error("You can't adjust your own balance. Ask another admin.");

  const target = await db.employee.findUnique({ where: { id: input.employeeId }, select: { role: true, firstName: true } });
  if (!target) throw new Error("Employee not found.");
  if (!tracksAttendance(target.role)) throw new Error("Super Admins don't have leave balances.");
  if (!canActOnEmployee(actor.role, target.role)) throw new Error("Only Super Admins can change an Admin's balance.");

  const delta = Number(input.delta);
  if (!Number.isFinite(delta) || delta === 0 || !Number.isInteger(delta * 2) || Math.abs(delta) > 365) {
    throw new Error("Enter days to add or remove, in steps of 0.5 (e.g. 2 or -1.5).");
  }
  const note = input.note?.trim() ?? "";
  if (note.length < 3) throw new Error("Add a short reason for the adjustment.");

  await ensureBalances(input.employeeId, input.year);
  const balance = await db.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId: input.employeeId, leaveTypeId: input.leaveTypeId, year: input.year } },
    include: { leaveType: { select: { name: true } } },
  });
  if (!balance) throw new Error("That leave type has no limit, so there's no balance to adjust.");

  await db.leaveBalance.update({ where: { id: balance.id }, data: { adjusted: { increment: delta } } });
  await notify(
    [input.employeeId],
    "Leave balance updated",
    `${actor.firstName} ${actor.lastName} ${delta > 0 ? "added" : "removed"} ${Math.abs(delta)} ${balance.leaveType.name} day${Math.abs(delta) === 1 ? "" : "s"}: ${note}`,
    "/leave"
  );
  audit({ actorId: actor.id, entity: "LeaveBalance", entityId: balance.id, action: "adjust", changes: { delta, note, year: input.year, leaveType: balance.leaveType.name } });
  revalidatePath(`/employees/${input.employeeId}`);
  revalidatePath("/leave");
  return { success: true };
}
