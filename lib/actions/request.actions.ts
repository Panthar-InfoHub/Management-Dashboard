"use server";
import { UserError } from "@/lib/errors";

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
import { excusedStatus, fixOutcomeFields, lateCutoffMinutes, formatTime, to12h, lateArrivalFields, FIX_OUTCOME_LABELS, LATE_ARRIVAL_OUTCOME_LABELS, type FixOutcome, type LateArrivalOutcome } from "@/lib/attendance/rules";
import { planAttendanceFix } from "@/lib/attendance/fix";
import { availableDays, requestDays, MAX_REQUEST_SPAN_DAYS, REQUEST_KIND_LABELS, type RequestKindValue } from "@/lib/leave/rules";
import { canDecideFor, ensureBalances, getCoverage } from "@/lib/leave/queries";
import { leaveYearOf } from "@/lib/leave/policy";
import { leadsOf } from "@/lib/teams/membership";
import { recalculateBalances } from "@/lib/leave/balances";
import { emailRequestDecided, emailRequestSubmitted } from "@/lib/email/notify";

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
  arriveBy?: string | null; // "HH:mm", late arrival asked before clocking in
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

/** Days in a range where the person has a clock-in (full-day leave can't cover them). */
async function workedDays(employeeId: string, fromKey: string, toKey: string) {
  const rows = await db.attendance.findMany({
    where: { employeeId, checkInAt: { not: null }, date: { gte: fromDateKey(fromKey), lte: fromDateKey(toKey) } },
    select: { date: true },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => r.date.toISOString().slice(0, 10));
}

/** Approved full-day leave on a date, if any. */
async function fullLeaveOn(employeeId: string, dateKey: string) {
  const c = (await getCoverage([employeeId], dateKey, dateKey)).get(employeeId)?.get(dateKey);
  return c?.kind === "LEAVE" && !c.halfDay ? c : null;
}

async function notify(recipientIds: string[], title: string, message: string, actionUrl: string) {
  if (recipientIds.length === 0) return;
  await db.notification.createMany({
    data: recipientIds.map((recipientId) => ({ recipientId, type: "REQUEST", title, message, actionUrl })),
  });
}

async function requireTracked(): Promise<AuthEmployee> {
  const employee = await getCurrentEmployee();
  if (!tracksAttendance(employee.role)) throw new UserError("Super Admins don't use leave or attendance requests.");
  return employee;
}

// ─── Submit ───

export async function submitRequestAction(input: SubmitInput) {
  const employee = await requireTracked();
  const office = await getOfficeFor(employee.id);
  const today = todayKey(office.timezone);

  const reason = input.reason?.trim() ?? "";
  if (reason.length < 3) throw new UserError("Add a short reason.");
  if (reason.length > 1000) throw new UserError("Keep the reason under 1000 characters.");

  const singleDay = input.kind === "ATTENDANCE_FIX" || input.kind === "LATE_ARRIVAL";
  const start = input.startDate, end = singleDay ? input.startDate : input.endDate || input.startDate;
  fromDateKey(start); fromDateKey(end);
  if (end < start) throw new UserError("The end date is before the start date.");
  const span = eachDateKey(start, end).length;
  if (span > MAX_REQUEST_SPAN_DAYS) throw new UserError(`A request can cover at most ${MAX_REQUEST_SPAN_DAYS} days. Split it into two.`);

  const days = await dayKindsBetween(office, start, end);
  const halfDay = input.kind === "LEAVE" ? input.halfDay ?? null : null;
  if (halfDay && start !== end) throw new UserError("A half day must be a single date.");

  let leaveTypeId: string | null = null;
  let fixCheckIn: Date | null = null, fixCheckOut: Date | null = null;
  let workMode: "OFFICE" | "WFH" | null = null;
  let arriveBy: Date | null = null;
  // Late arrival on a day already clocked in: an earlier approval didn't cover it, so a new request may be sent.
  let lateDayClockedIn = false;
  const count = requestDays(input.kind, days, !!halfDay);

  if (input.kind === "LEAVE") {
    const type = input.leaveTypeId ? await db.leaveType.findUnique({ where: { id: input.leaveTypeId } }) : null;
    if (!type || !type.isActive) throw new UserError("Choose a leave type.");
    if (!halfDay) {
      const worked = await workedDays(employee.id, start, end);
      if (worked.length) {
        throw new UserError(`You clocked in on ${worked.map((d) => rangeLabel(d, d)).join(", ")}, so full-day leave can't cover ${worked.length === 1 ? "that day" : "those days"}. Pick other dates, or ask for a half day.`);
      }
    }
    leaveTypeId = type.id;
    if (leaveYearOf(start) !== leaveYearOf(end)) throw new UserError("Leave can't cross into the next year. Split it at 31 December.");
    if (count === 0) throw new UserError("Those dates are all days off or holidays, so there's nothing to take.");
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
        throw new UserError(`You have ${left} ${type.name} day${left === 1 ? "" : "s"} left (pending requests included), and this needs ${count}. Choose Unpaid Leave or fewer days.`);
      }
    }
  } else if (input.kind === "WFH") {
    if (count === 0) throw new UserError("Those dates have no office days, so there's nothing to work from home.");
  } else if (input.kind === "ATTENDANCE_FIX") {
    if (start > today) throw new UserError("You can only fix today or an earlier day.");
    const oldest = eachDateKey(start, today).length - 1;
    if (oldest > FIX_LOOKBACK_DAYS) throw new UserError(`Attendance can be fixed for the last ${FIX_LOOKBACK_DAYS} days only.`);
    // Clock-in always; clock-out for a past day. Today it's optional: they're still working.
    const isToday = start === today;
    if (!input.fixCheckIn) throw new UserError("Enter the clock-in time.");
    if (!input.fixCheckOut && !isToday) throw new UserError("Enter the clock-out time too. It's only optional for today, while you're still working.");
    const leaveThatDay = await fullLeaveOn(employee.id, start);
    if (leaveThatDay) throw new UserError(`${rangeLabel(start, start)} is approved ${leaveThatDay.typeName ?? "leave"}. Cancel the leave first if you worked that day.`);
    if (input.fixCheckOut && parseHHmm(input.fixCheckOut) <= parseHHmm(input.fixCheckIn)) throw new UserError("Clock-out must be after clock-in.");
    if (isToday) {
      const nowMin = minutesOfDay(office.timezone, new Date());
      if (parseHHmm(input.fixCheckIn) > nowMin || (input.fixCheckOut && parseHHmm(input.fixCheckOut) > nowMin)) {
        throw new UserError("Those times are later than now. Enter times that have already happened.");
      }
    }
    workMode = input.workMode === "WFH" ? "WFH" : "OFFICE";
    fixCheckIn = zonedDateTime(start, input.fixCheckIn, office.timezone);
    fixCheckOut = input.fixCheckOut ? zonedDateTime(start, input.fixCheckOut, office.timezone) : null;
    const recorded = await db.attendance.findUnique({ where: { employeeId_date: { employeeId: employee.id, date: fromDateKey(start) } }, select: { checkInAt: true, checkOutAt: true } });
    if (recorded?.checkInAt?.getTime() === fixCheckIn.getTime() && (!fixCheckOut || recorded.checkOutAt?.getTime() === fixCheckOut.getTime())) {
      throw new UserError("Those are the times already recorded. Change the one that's wrong.");
    }
  } else if (input.kind === "LATE_ARRIVAL") {
    // Before the day (a heads-up) or after it; the clock-in time is never changed.
    const span = start < today ? eachDateKey(start, today).length - 1 : eachDateKey(today, start).length - 1;
    if (span > FIX_LOOKBACK_DAYS) throw new UserError(`A late arrival can be asked for up to ${FIX_LOOKBACK_DAYS} days before or after the day.`);
    if (days[0].dayKind !== "OFFICE" && days[0].dayKind !== "WFH") throw new UserError(`${rangeLabel(start, start)} isn't a working day, so being late doesn't count.`);
    const leaveThatDay = await fullLeaveOn(employee.id, start);
    if (leaveThatDay) throw new UserError(`${rangeLabel(start, start)} is approved ${leaveThatDay.typeName ?? "leave"}, so there's no late arrival to excuse.`);
    const day = start <= today
      ? await db.attendance.findUnique({ where: { employeeId_date: { employeeId: employee.id, date: fromDateKey(start) } }, select: { checkInAt: true, isLate: true } })
      : null;
    if (day?.checkInAt && !day.isLate) throw new UserError(`You weren't late on ${rangeLabel(start, start)}, so there's nothing to excuse.`);
    if (!day?.checkInAt && start < today) throw new UserError(`You didn't clock in on ${rangeLabel(start, start)}. Send a time correction with your times instead.`);
    lateDayClockedIn = !!day?.checkInAt;
    // Asked before clocking in: say when you'll arrive. The approval covers up to then (plus the office grace).
    if (!day?.checkInAt) {
      if (!input.arriveBy) throw new UserError("Enter the time you'll arrive by.");
      const by = parseHHmm(input.arriveBy);
      if (by <= lateCutoffMinutes(office.lateAfter, office.graceMinutes)) throw new UserError(`${to12h(input.arriveBy)} isn't late, so no request is needed. Clock in by then as usual.`);
      if (by >= parseHHmm(office.workEnd)) throw new UserError(`Arrive by a time before office end (${to12h(office.workEnd)}). For a later start, apply for a half day of leave.`);
      arriveBy = zonedDateTime(start, input.arriveBy, office.timezone);
    }
  } else {
    throw new UserError("Unknown request type.");
  }

  // No overlapping open requests: leave/WFH block each other; fixes and late arrivals are per date.
  const overlap = await db.request.findFirst({
    where: {
      employeeId: employee.id,
      status: { in: lateDayClockedIn ? ["PENDING"] : ["PENDING", "APPROVED"] },
      kind: singleDay ? input.kind : { in: ["LEAVE", "WFH"] },
      startDate: { lte: fromDateKey(end) },
      endDate: { gte: fromDateKey(start) },
    },
    select: { kind: true, startDate: true, endDate: true, status: true },
  });
  if (overlap) {
    throw new UserError(`You already have a ${overlap.status.toLowerCase()} ${REQUEST_KIND_LABELS[overlap.kind as RequestKindValue].toLowerCase()} request covering ${rangeLabel(overlap.startDate.toISOString().slice(0, 10), overlap.endDate.toISOString().slice(0, 10))}. Cancel it first.`);
  }

  const request = await db.request.create({
    data: {
      employeeId: employee.id, kind: input.kind, leaveTypeId, startDate: fromDateKey(start), endDate: fromDateKey(end),
      halfDay, days: count, reason, fixCheckIn, fixCheckOut, workMode, arriveBy,
    },
  });

  const approvers = await findApprovers(employee.id);
  await notify(approvers, `${REQUEST_KIND_LABELS[input.kind]} request`, `${employee.firstName} ${employee.lastName} asked for ${REQUEST_KIND_LABELS[input.kind].toLowerCase()} on ${rangeLabel(start, end)}.`, "/approvals");
  emailRequestSubmitted(request.id, input.kind, approvers);
  audit({ actorId: employee.id, entity: "Request", entityId: request.id, action: "create", changes: { kind: input.kind, start, end, days: count, halfDay } });
  refresh();
  return { success: true, id: request.id, days: count };
}

// ─── Attendance fix form ───

/** What is recorded for one of my days, to start the fix form from. Times are "HH:mm". */
export async function getMyFixDayAction(dateKey: string) {
  const employee = await requireTracked();
  const office = await getOfficeFor(employee.id);
  fromDateKey(dateKey);
  const row = await db.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: fromDateKey(dateKey) } },
    select: { status: true, dayKind: true, checkInAt: true, checkOutAt: true, missedCheckout: true },
  });
  return {
    isToday: dateKey === todayKey(office.timezone),
    checkIn: row?.checkInAt ? formatTime(row.checkInAt, office.timezone) : null,
    checkOut: row?.checkOutAt ? formatTime(row.checkOutAt, office.timezone) : null,
    stillClockedIn: !!row?.checkInAt && !row.checkOutAt && !row.missedCheckout,
    workMode: row?.dayKind === "WFH" ? ("WFH" as const) : ("OFFICE" as const),
  };
}

// ─── Cancel (requester) ───

export async function cancelRequestAction(requestId: string) {
  const employee = await getCurrentEmployee();
  const request = await db.request.findUnique({ where: { id: requestId } });
  if (!request || request.employeeId !== employee.id) throw new UserError("Request not found.");

  const office = await getOfficeFor(employee.id);
  const today = todayKey(office.timezone);
  const startKey = request.startDate.toISOString().slice(0, 10);
  const cancellable = request.status === "PENDING" || (request.status === "APPROVED" && startKey > today);
  if (!cancellable) throw new UserError("Only pending requests, or approved ones that haven't started, can be cancelled.");
  if (request.kind === "WFH" && request.status === "PENDING") {
    const clockedIn = await db.attendance.count({ where: { employeeId: employee.id, date: { gte: request.startDate, lte: request.endDate }, awaitingWfh: true } });
    if (clockedIn) throw new UserError("You've already clocked in from home under this request, so it needs a decision. Ask your approver to approve or reject it.");
  }

  await db.$transaction(async (tx) => {
    const updated = await tx.request.updateMany({ where: { id: requestId, status: request.status }, data: { status: "CANCELLED" } });
    if (updated.count === 0) throw new UserError("This request just changed. Reload and try again.");
  });
  // Approved leave gives its days back.
  if (request.status === "APPROVED" && request.kind === "LEAVE") await recalculateBalances([employee.id], leaveYearOf(startKey));

  audit({ actorId: employee.id, entity: "Request", entityId: requestId, action: "cancel", changes: { from: request.status } });
  refresh();
  return { success: true };
}

// ─── Decide (approver) ───

/**
 * Write an approved attendance fix onto the day, with the status the approver
 * chose (the office rules only suggest one). The day counts as decided, so a
 * later clock-out adds hours but doesn't work the status out again. A fix with
 * no clock-out leaves today open; see lib/attendance/fix.ts.
 */
async function applyAttendanceFix(
  request: { employeeId: string; startDate: Date; fixCheckIn: Date | null; fixCheckOut: Date | null; reason: string; workMode: string | null },
  actorId: string,
  chosen: FixOutcome | undefined,
) {
  if (!request.fixCheckIn) throw new UserError("This fix has no clock-in time.");
  const plan = await planAttendanceFix({ ...request, fixCheckIn: request.fixCheckIn });
  const outcome = chosen ?? plan.suggested;
  if (!plan.choices.includes(outcome)) throw new UserError(`Choose ${plan.choices.map((c) => FIX_OUTCOME_LABELS[c]).join(", ")} for this day.`);

  const fields = fixOutcomeFields(outcome, plan.arrivedLate);
  const data = {
    officeId: plan.office.id, dayKind: plan.dayKind, ...fields,
    reviewStatus: "APPROVED" as const, reviewedById: actorId, reviewedAt: new Date(),
    // No clock-out yet: today stays open for a normal clock-out; a past day closes as a missed checkout.
    checkInAt: plan.checkIn, checkOutAt: plan.checkOut, workMinutes: plan.minutes, missedCheckout: plan.open && plan.isPast, ...plan.flags,
    awaitingWfh: false,
    note: `Fixed by request: ${request.reason}`.slice(0, 500),
  };
  const record = await db.attendance.upsert({
    where: { employeeId_date: { employeeId: request.employeeId, date: request.startDate } },
    create: { ...data, employeeId: request.employeeId, date: request.startDate },
    update: data,
  });
  await db.attendanceEvent.create({
    data: { attendanceId: record.id, employeeId: request.employeeId, type: "ADMIN_FIX", at: new Date(), actorId, note: `Time correction approved as ${FIX_OUTCOME_LABELS[outcome]}` },
  });
  return outcome;
}

/**
 * An approved Late Arrival on a day already clocked in: the late day stops
 * being a half day and becomes what the approver chose. Times stay as they
 * are. A day not clocked in yet picks it up at clock-in (lib/attendance/service.ts).
 */
async function applyLateArrival(request: { employeeId: string; startDate: Date }, outcome: LateArrivalOutcome, actorId: string, why: string) {
  const row = await db.attendance.findUnique({
    where: { employeeId_date: { employeeId: request.employeeId, date: request.startDate } },
    select: { id: true, dayKind: true, checkInAt: true, isLate: true },
  });
  if (!row?.checkInAt) return;
  const fields = lateArrivalFields(row.dayKind, outcome, row.isLate);
  if (!fields) return;
  await db.attendance.update({
    where: { id: row.id },
    data: { ...fields, reviewStatus: "APPROVED", reviewedById: actorId, reviewedAt: new Date() },
  });
  await db.attendanceEvent.create({
    data: { attendanceId: row.id, employeeId: request.employeeId, type: "ADMIN_FIX", at: new Date(), actorId, note: `Late arrival approved as ${LATE_ARRIVAL_OUTCOME_LABELS[outcome]}: ${why}`.slice(0, 500) },
  });
}

/**
 * Clear the late mark on a person's days in a range, keeping a record that it
 * was excused. A Late day becomes Present; a half day that was only for being
 * late becomes Present; WFH stays WFH.
 */
async function excuseLateDays(employeeId: string, from: Date, to: Date, actorId: string, why: string) {
  const rows = await db.attendance.findMany({
    where: { employeeId, date: { gte: from, lte: to }, isLate: true },
    select: { id: true, status: true },
  });
  for (const row of rows) {
    await db.attendance.update({
      where: { id: row.id },
      data: {
        isLate: false, lateExcused: true, status: excusedStatus(row.status),
        ...(row.status === "HALF_DAY" ? { reviewStatus: "APPROVED" as const, reviewedById: actorId, reviewedAt: new Date() } : {}),
      },
    });
    await db.attendanceEvent.create({ data: { attendanceId: row.id, employeeId, type: "ADMIN_FIX", at: new Date(), actorId, note: `Late excused: ${why}`.slice(0, 500) } });
  }
  return rows.length;
}

/**
 * Days someone clocked in from home while their WFH request was pending:
 * approving confirms them as WFH; rejecting makes them Absent (times kept on record).
 */
async function settleAwaitingWfh(employeeId: string, from: Date, to: Date, approved: boolean, actorId: string) {
  const rows = await db.attendance.findMany({
    where: { employeeId, date: { gte: from, lte: to }, awaitingWfh: true },
    select: { id: true },
  });
  for (const row of rows) {
    await db.attendance.update({
      where: { id: row.id },
      data: approved
        ? { awaitingWfh: false }
        : { awaitingWfh: false, status: "ABSENT", isLate: false, note: "WFH request rejected: worked from home without approval" },
    });
    await db.attendanceEvent.create({
      data: { attendanceId: row.id, employeeId, type: "ADMIN_FIX", at: new Date(), actorId, note: approved ? "WFH approved" : "WFH rejected: marked Absent" },
    });
  }
  return rows.length;
}

export async function decideRequestAction(
  requestId: string,
  decision: "APPROVE" | "REJECT",
  note?: string | null,
  opts: { excuseLate?: boolean; fixOutcome?: FixOutcome; lateOutcome?: LateArrivalOutcome } = {},
) {
  const actor = await getCurrentEmployee();
  const request = await db.request.findUnique({ where: { id: requestId }, include: { leaveType: true } });
  if (!request) throw new UserError("Request not found.");
  if (request.employeeId === actor.id) throw new UserError("You can't decide your own request.");
  if (!(await canDecideFor(actor, request.employeeId))) throw new UserError("You can't decide requests for this person.");
  if (request.status !== "PENDING") throw new UserError(`This request is already ${request.status.toLowerCase()}.`);
  const decisionNote = note?.trim().slice(0, 500) || null;
  // Only WFH requests excuse lateness this way (also for clock-ins after approval);
  // an attendance fix records the status the approver picks instead.
  const excuseLateWfh = decision === "APPROVE" && !!opts.excuseLate && request.kind === "WFH";
  // A late arrival is approved as Present (stored as excuseLate) or Late.
  const lateOutcome: LateArrivalOutcome | null = decision === "APPROVE" && request.kind === "LATE_ARRIVAL"
    ? (opts.lateOutcome === "PRESENT" ? "PRESENT" : "LATE")
    : null;
  const excuseLate = lateOutcome ? lateOutcome === "PRESENT" : excuseLateWfh;
  const startKey = request.startDate.toISOString().slice(0, 10);

  const endKey = request.endDate.toISOString().slice(0, 10);
  if (decision === "APPROVE" && request.kind === "LEAVE" && !request.halfDay) {
    const worked = await workedDays(request.employeeId, startKey, endKey);
    if (worked.length) {
      throw new UserError(`They clocked in on ${worked.map((d) => rangeLabel(d, d)).join(", ")}. Reject this and ask them to change the dates, or set those days to Absent first (Team Day → Edit).`);
    }
  }
  if (decision === "APPROVE" && request.kind === "ATTENDANCE_FIX") {
    const leave = await fullLeaveOn(request.employeeId, startKey);
    if (leave) throw new UserError(`That day is approved ${leave.typeName ?? "leave"}. Reject the fix, or cancel the leave first.`);
  }
  if (decision === "APPROVE" && request.kind === "LEAVE" && request.leaveType?.yearlyDays != null) {
    await ensureBalances(request.employeeId, leaveYearOf(startKey));
  }

  await db.$transaction(async (tx) => {
    // Guarded update: only one approver can move it out of PENDING.
    const updated = await tx.request.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED", decidedById: actor.id, decidedAt: new Date(), decisionNote, excuseLate },
    });
    if (updated.count === 0) throw new UserError("Someone else just decided this request.");

    if (decision === "APPROVE" && request.kind === "LEAVE" && request.leaveTypeId && request.leaveType?.yearlyDays != null) {
      const year = leaveYearOf(startKey);
      const balance = await tx.leaveBalance.findUnique({ where: { employeeId_leaveTypeId_year: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year } } });
      const otherPending = await tx.request.aggregate({
        where: { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, kind: "LEAVE", status: "PENDING", id: { not: requestId }, startDate: { gte: fromDateKey(`${year}-01-01`), lte: fromDateKey(`${year}-12-31`) } },
        _sum: { days: true },
      });
      const left = balance ? availableDays(balance, otherPending._sum.days ?? 0) : 0;
      if (request.days > left) throw new UserError(`Not enough ${request.leaveType.name} left (${left} days). Reject it, or ask them to choose Unpaid Leave.`);
    }
  });
  if (decision === "APPROVE" && request.kind === "LEAVE") await recalculateBalances([request.employeeId], leaveYearOf(startKey));

  let fixOutcome: FixOutcome | null = null;
  if (decision === "APPROVE" && request.kind === "ATTENDANCE_FIX") {
    fixOutcome = await applyAttendanceFix(request, actor.id, opts.fixOutcome);
  }
  if (request.kind === "WFH") {
    await settleAwaitingWfh(request.employeeId, request.startDate, request.endDate, decision === "APPROVE", actor.id);
  }
  if (lateOutcome) {
    await applyLateArrival(request, lateOutcome, actor.id, decisionNote ?? request.reason);
  }
  if (excuseLateWfh) {
    await excuseLateDays(request.employeeId, request.startDate, request.endDate, actor.id, decisionNote ?? REQUEST_KIND_LABELS[request.kind as RequestKindValue]);
  }

  const verb = decision === "APPROVE" ? "approved" : "rejected";
  await notify(
    [request.employeeId],
    `${REQUEST_KIND_LABELS[request.kind as RequestKindValue]} ${verb}`,
    `${actor.firstName} ${actor.lastName} ${verb} your request for ${rangeLabel(startKey, request.endDate.toISOString().slice(0, 10))}${fixOutcome ? `, counted as ${FIX_OUTCOME_LABELS[fixOutcome]}` : ""}${lateOutcome ? `, counted as ${LATE_ARRIVAL_OUTCOME_LABELS[lateOutcome]}` : ""}${decisionNote ? `: ${decisionNote}` : "."}`,
    "/leave"
  );
  emailRequestDecided(requestId, request.kind);
  audit({ actorId: actor.id, entity: "Request", entityId: requestId, action: verb, changes: { note: decisionNote, excuseLate, ...(fixOutcome && { fixOutcome }), ...(lateOutcome && { lateOutcome }) } });
  refresh();
  return { success: true };
}

// ─── Undo a decision (approver) ───

/**
 * Put a decided leave/WFH request back to Pending, e.g. approved by mistake.
 * Approved leave returns its days. Attendance fixes can't be undone this way
 * because they rewrote the day: edit the day instead.
 */
export async function undoDecisionAction(requestId: string, note: string) {
  const actor = await getCurrentEmployee();
  const request = await db.request.findUnique({ where: { id: requestId } });
  if (!request) throw new UserError("Request not found.");
  if (request.employeeId === actor.id) throw new UserError("You can't change a decision on your own request.");
  if (!(await canDecideFor(actor, request.employeeId))) throw new UserError("You can't change decisions for this person.");
  if (request.status !== "APPROVED" && request.status !== "REJECTED") throw new UserError("Only approved or rejected requests can be undone.");
  if (request.kind === "ATTENDANCE_FIX" && request.status === "APPROVED") {
    throw new UserError("An approved time correction already changed the day. Use Team Day → Edit to change it.");
  }
  if (request.kind === "LATE_ARRIVAL" && request.status === "APPROVED") {
    const clockedIn = await db.attendance.count({ where: { employeeId: request.employeeId, date: request.startDate, checkInAt: { not: null } } });
    if (clockedIn) throw new UserError("This late arrival already changed the day. Use Team Day → Edit to correct it.");
  }
  const reason = note?.trim() ?? "";
  if (reason.length < 3) throw new UserError("Say why you're undoing it; they'll see this.");

  const updated = await db.request.updateMany({
    where: { id: requestId, status: request.status },
    data: { status: "PENDING", excuseLate: false, decidedById: null, decidedAt: null, decisionNote: `Reopened by ${actor.firstName} ${actor.lastName}: ${reason}`.slice(0, 500) },
  });
  if (updated.count === 0) throw new UserError("This request just changed. Reload and try again.");

  const startKey = request.startDate.toISOString().slice(0, 10);
  if (request.kind === "LEAVE" && request.status === "APPROVED") await recalculateBalances([request.employeeId], leaveYearOf(startKey));
  const flexible = request.kind === "WFH" && !!(await db.employee.findUnique({ where: { id: request.employeeId }, select: { flexibleWfh: true } }))?.flexibleWfh;
  if (request.kind === "WFH" && !flexible) {
    // Home clock-ins under this request wait for the new decision again.
    await db.attendance.updateMany({
      where: { employeeId: request.employeeId, date: { gte: request.startDate, lte: request.endDate }, dayKind: "WFH", checkInAt: { not: null } },
      data: { awaitingWfh: true },
    });
    if (request.status === "REJECTED") {
      await db.attendance.updateMany({
        where: { employeeId: request.employeeId, date: { gte: request.startDate, lte: request.endDate }, dayKind: "WFH", checkInAt: { not: null }, status: "ABSENT" },
        data: { status: "WFH" },
      });
    }
  }

  await notify(
    [request.employeeId],
    "Request reopened",
    `${actor.firstName} ${actor.lastName} reopened your ${REQUEST_KIND_LABELS[request.kind as RequestKindValue].toLowerCase()} request for ${rangeLabel(startKey, request.endDate.toISOString().slice(0, 10))}: ${reason}. It's waiting for a decision again.`,
    "/leave"
  );
  audit({ actorId: actor.id, entity: "Request", entityId: requestId, action: "undo", changes: { from: request.status, reason } });
  refresh();
  return { success: true };
}

// ─── Late half-day review ───

/**
 * A day marked Half Day (late clock-in, or under the minimum hours) waits for an
 * approver: keep it as a half day, or make it a full day. A full day is
 * Present, with a late arrival kept on record as excused.
 */
export async function reviewAttendanceAction(attendanceId: string, decision: "KEEP_HALF_DAY" | "MAKE_FULL_DAY", note?: string | null) {
  const actor = await getCurrentEmployee();
  const record = await db.attendance.findUnique({ where: { id: attendanceId }, select: { id: true, employeeId: true, date: true, isLate: true, reviewStatus: true } });
  if (!record || record.reviewStatus !== "PENDING") throw new UserError("This day is no longer waiting for review.");
  if (record.employeeId === actor.id) throw new UserError("You can't review your own attendance.");
  if (!(await canDecideFor(actor, record.employeeId))) throw new UserError("You can't review attendance for this person.");

  // A full day is Present: a late arrival is excused, and kept on record as excused.
  const excused = decision === "MAKE_FULL_DAY";
  const updated = await db.attendance.updateMany({
    where: { id: attendanceId, reviewStatus: "PENDING" },
    data: {
      reviewStatus: excused ? "REJECTED" : "APPROVED",
      reviewedById: actor.id,
      reviewedAt: new Date(),
      ...(excused && { status: "PRESENT", isLate: false, lateExcused: record.isLate }),
      ...(note?.trim() && { note: note.trim().slice(0, 500) }),
    },
  });
  if (updated.count === 0) throw new UserError("Someone else just reviewed this day.");

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
  if (!(await hasPermission(actor, "leave:manage"))) throw new UserError("You don't have permission to adjust leave balances.");
  if (input.employeeId === actor.id) throw new UserError("You can't adjust your own balance. Ask another admin.");

  const target = await db.employee.findUnique({ where: { id: input.employeeId }, select: { role: true, firstName: true } });
  if (!target) throw new UserError("Employee not found.");
  if (!tracksAttendance(target.role)) throw new UserError("Super Admins don't have leave balances.");
  if (!canActOnEmployee(actor.role, target.role)) throw new UserError("Only Super Admins can change an Admin's balance.");

  const delta = Number(input.delta);
  if (!Number.isFinite(delta) || delta === 0 || !Number.isInteger(delta * 2) || Math.abs(delta) > 365) {
    throw new UserError("Enter days to add or remove, in steps of 0.5 (e.g. 2 or -1.5).");
  }
  const note = input.note?.trim() ?? "";
  if (note.length < 3) throw new UserError("Add a short reason for the adjustment.");

  await ensureBalances(input.employeeId, input.year);
  const balance = await db.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId: input.employeeId, leaveTypeId: input.leaveTypeId, year: input.year } },
    include: { leaveType: { select: { name: true } } },
  });
  if (!balance) throw new UserError("That leave type has no limit, so there's no balance to adjust.");
  if (delta < 0) {
    const pending = await db.request.aggregate({
      where: { employeeId: input.employeeId, leaveTypeId: input.leaveTypeId, kind: "LEAVE", status: "PENDING", startDate: { gte: fromDateKey(`${input.year}-01-01`), lte: fromDateKey(`${input.year}-12-31`) } },
      _sum: { days: true },
    });
    const left = availableDays(balance, pending._sum.days ?? 0);
    if (left + delta < 0) {
      throw new UserError(left <= 0
        ? `${target.firstName} has no ${balance.leaveType.name} left to remove.`
        : `${target.firstName} has only ${left} ${balance.leaveType.name} day${left === 1 ? "" : "s"} left. Remove ${left} or fewer.`);
    }
  }

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
