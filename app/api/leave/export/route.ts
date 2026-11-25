// Leave report for a year as Excel: balances per person per type, and every
// leave request. Needs leave:manage. Includes people who left during the year.
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { fromDateKey, toDateKey } from "@/lib/attendance/calendar";
import { getBalances } from "@/lib/leave/queries";
import { audit } from "@/lib/audit";

export async function GET(request: Request) {
  let viewer;
  try {
    viewer = await getCurrentEmployee();
  } catch {
    return new Response("Sign in to export the leave report.", { status: 401 });
  }
  if (!(await hasPermission(viewer, "leave:manage"))) {
    return new Response("You don't have permission to export the leave report.", { status: 403 });
  }

  const year = Number(new URL(request.url).searchParams.get("year"));
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return new Response("Choose a year, e.g. ?year=2026.", { status: 400 });
  const yearStart = fromDateKey(`${year}-01-01`), yearEnd = fromDateKey(`${year}-12-31`);

  const people = await db.employee.findMany({
    where: { role: { not: "SUPER_ADMIN" }, joinDate: { lte: yearEnd }, OR: [{ status: "ACTIVE" }, { exitDate: { gte: yearStart } }] },
    orderBy: { firstName: "asc" },
    select: {
      id: true, firstName: true, lastName: true, exitDate: true,
      teamMemberships: { select: { team: { select: { name: true } } } },
    },
  });
  const requests = await db.request.findMany({
    where: { kind: "LEAVE", startDate: { gte: yearStart, lte: yearEnd } },
    orderBy: [{ startDate: "asc" }],
    select: {
      startDate: true, endDate: true, halfDay: true, days: true, status: true, reason: true, decidedAt: true, decisionNote: true,
      employee: { select: { firstName: true, lastName: true } },
      leaveType: { select: { name: true, yearlyDays: true } },
      decidedBy: { select: { firstName: true, lastName: true } },
    },
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Panthar Teams";
  wb.created = new Date();

  const balances = wb.addWorksheet("Balances");
  balances.columns = [
    { header: "Name", key: "name", width: 26 },
    { header: "Teams", key: "teams", width: 28 },
    { header: "Left On", key: "left", width: 11 },
    { header: "Leave Type", key: "type", width: 16 },
    { header: "Allowed", key: "allowed", width: 9 },
    { header: "Carried Over", key: "carried", width: 12 },
    { header: "Adjusted", key: "adjusted", width: 9 },
    { header: "Used", key: "used", width: 7 },
    { header: "Pending", key: "pending", width: 8 },
    { header: "Available", key: "available", width: 10 },
  ];
  balances.getRow(1).font = { bold: true };

  for (const p of people) {
    const name = `${p.firstName} ${p.lastName}`;
    const teams = p.teamMemberships.map((m) => m.team.name).join(", ");
    const left = p.exitDate ? toDateKey(p.exitDate) : "";
    for (const b of await getBalances(p.id, year)) {
      if (b.unlimited) {
        const taken = requests.filter((r) => r.status === "APPROVED" && r.leaveType?.name === b.name && `${r.employee.firstName} ${r.employee.lastName}` === name).reduce((n, r) => n + r.days, 0);
        balances.addRow({ name, teams, left, type: b.name, allowed: "No limit", carried: "", adjusted: "", used: taken, pending: b.pending, available: "" });
      } else {
        balances.addRow({ name, teams, left, type: b.name, allowed: b.allowed, carried: b.carriedOver, adjusted: b.adjusted, used: b.used, pending: b.pending, available: b.available });
      }
    }
  }

  const list = wb.addWorksheet("Leave Requests");
  list.columns = [
    { header: "Name", key: "name", width: 26 },
    { header: "Leave Type", key: "type", width: 16 },
    { header: "From", key: "from", width: 11 },
    { header: "To", key: "to", width: 11 },
    { header: "Half Day", key: "half", width: 12 },
    { header: "Days", key: "days", width: 6 },
    { header: "Status", key: "status", width: 10 },
    { header: "Reason", key: "reason", width: 34 },
    { header: "Decided By", key: "by", width: 20 },
    { header: "Decided On", key: "on", width: 11 },
    { header: "Note", key: "note", width: 30 },
  ];
  list.getRow(1).font = { bold: true };
  for (const r of requests) {
    list.addRow({
      name: `${r.employee.firstName} ${r.employee.lastName}`,
      type: r.leaveType?.name ?? "",
      from: toDateKey(r.startDate),
      to: toDateKey(r.endDate),
      half: r.halfDay === "FIRST_HALF" ? "First half" : r.halfDay === "SECOND_HALF" ? "Second half" : "",
      days: r.days,
      status: r.status.charAt(0) + r.status.slice(1).toLowerCase(),
      reason: r.reason,
      by: r.decidedBy ? `${r.decidedBy.firstName} ${r.decidedBy.lastName}` : "",
      on: r.decidedAt ? r.decidedAt.toISOString().slice(0, 10) : "",
      note: r.decisionNote ?? "",
    });
  }
  for (const ws of [balances, list]) ws.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  audit({ actorId: viewer.id, entity: "LeaveBalance", entityId: String(year), action: "export", changes: { people: people.length, requests: requests.length } });
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="leave-report-${year}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
