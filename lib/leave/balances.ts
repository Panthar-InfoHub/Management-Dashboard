// Leave balances are derived from the records, so they can't drift:
//   allowed     = leave type's yearly days, prorated from the later of the join
//                 date and LEAVE_TRACKING_START
//   used        = sum of approved leave days of that type in that year
//   adjusted    = manual HR adjustments (kept as entered)
// Recalculate after anything that changes those inputs.
import { db } from "@/lib/db";
import { fromDateKey, toDateKey } from "@/lib/attendance/calendar";
import { dayKindsBetween, getOfficeFor } from "@/lib/attendance/queries";
import { proratedAllowance, requestDays, type RequestKindValue } from "@/lib/leave/rules";
import { LEAVE_TRACKING_START, leaveYearOf } from "@/lib/leave/policy";
import { ensureBalances } from "@/lib/leave/queries";

/** Recalculate one person's balances for a year (and the year before, for late approvals). */
async function recalcOne(employeeId: string, year: number) {
  const employee = await db.employee.findUnique({ where: { id: employeeId }, select: { joinDate: true } });
  if (!employee) return;
  const joinKey = toDateKey(employee.joinDate);
  const startKey = joinKey > LEAVE_TRACKING_START ? joinKey : LEAVE_TRACKING_START;

  for (const y of [year - 1, year]) {
    const rows = await db.leaveBalance.findMany({ where: { employeeId, year: y }, include: { leaveType: true } });
    if (rows.length === 0) continue;
    const approved = await db.request.groupBy({
      by: ["leaveTypeId"],
      where: { employeeId, kind: "LEAVE", status: "APPROVED", startDate: { gte: fromDateKey(`${y}-01-01`), lte: fromDateKey(`${y}-12-31`) } },
      _sum: { days: true },
    });
    for (const b of rows) {
      if (b.leaveType.yearlyDays === null) continue; // unlimited types keep no balance
      await db.leaveBalance.update({
        where: { id: b.id },
        data: {
          allowed: proratedAllowance(b.leaveType.yearlyDays, y, startKey),
          used: approved.find((a) => a.leaveTypeId === b.leaveTypeId)?._sum.days ?? 0,
        },
      });
    }
  }
}

/** Recalculate balances for these people (or everyone with balances) in a year. */
export async function recalculateBalances(employeeIds: string[] | "ALL", year: number) {
  const ids = employeeIds === "ALL"
    ? (await db.leaveBalance.findMany({ where: { year: { in: [year - 1, year] } }, distinct: ["employeeId"], select: { employeeId: true } })).map((r) => r.employeeId)
    : [...new Set(employeeIds)];
  for (const id of ids) {
    await ensureBalances(id, year);
    await recalcOne(id, year);
  }
  return ids.length;
}

/**
 * Re-count working days on open and approved leave/WFH requests that touch a
 * date range (after a holiday or the working week changes), then fix balances.
 */
export async function recomputeRequestDays(fromKey: string, toKey: string) {
  const requests = await db.request.findMany({
    where: {
      kind: { in: ["LEAVE", "WFH"] },
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: fromDateKey(toKey) },
      endDate: { gte: fromDateKey(fromKey) },
    },
    select: { id: true, employeeId: true, kind: true, startDate: true, endDate: true, halfDay: true, days: true },
  });

  const touched = new Map<number, Set<string>>();
  for (const r of requests) {
    const office = await getOfficeFor(r.employeeId);
    const days = requestDays(r.kind as RequestKindValue, await dayKindsBetween(office, toDateKey(r.startDate), toDateKey(r.endDate)), !!r.halfDay);
    if (days !== r.days) {
      await db.request.update({ where: { id: r.id }, data: { days } });
      if (r.kind === "LEAVE") {
        const year = leaveYearOf(toDateKey(r.startDate));
        touched.set(year, (touched.get(year) ?? new Set()).add(r.employeeId));
      }
    }
  }
  for (const [year, ids] of touched) await recalculateBalances([...ids], year);
  return requests.length;
}
