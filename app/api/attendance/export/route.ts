// Monthly attendance as an Excel file: a Summary sheet, a Daily grid sheet and
// a Detail sheet (one row per person per day). Needs attendance:export; the
// people included follow the same scope as Team Attendance.
import ExcelJS from "exceljs";
import { getCurrentEmployee } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getTeamMonth } from "@/lib/attendance/queries";
import { fromDateKey, WEEKDAYS } from "@/lib/attendance/calendar";
import { ATTENDANCE_STATUS_LABELS, type AttendanceStatusValue } from "@/lib/attendance/rules";
import { audit } from "@/lib/audit";

const CODES: Record<AttendanceStatusValue, string> = {
  PRESENT: "P", LATE: "L", HALF_DAY: "HD", ABSENT: "A", ON_LEAVE: "LV", WFH: "W", HOLIDAY: "H", WEEKLY_OFF: "OFF",
};
const hours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;

export async function GET(request: Request) {
  let viewer;
  try {
    viewer = await getCurrentEmployee();
  } catch {
    return new Response("Sign in to export attendance.", { status: 401 });
  }
  if (!(await hasPermission(viewer, "attendance:export"))) {
    return new Response("You don't have permission to export attendance.", { status: 403 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return new Response("Choose a month, e.g. ?month=2026-11.", { status: 400 });

  const data = await getTeamMonth(viewer, month, url.searchParams.get("team"));
  if (!data) return new Response("No attendance you can view.", { status: 403 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Panthar Teams";
  wb.created = new Date();
  const header = { bold: true };

  // Summary
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Name", key: "name", width: 26 },
    { header: "Team", key: "team", width: 18 },
    { header: "Present", key: "present", width: 9 },
    { header: "WFH", key: "wfh", width: 7 },
    { header: "Late", key: "late", width: 7 },
    { header: "Half Day", key: "half", width: 9 },
    { header: "On Leave", key: "leave", width: 9 },
    { header: "Absent", key: "absent", width: 8 },
    { header: "Left Early (days)", key: "early", width: 16 },
    { header: "Missed Checkout", key: "missed", width: 16 },
    { header: "Worked (h)", key: "worked", width: 11 },
    { header: "Overtime (h)", key: "overtime", width: 12 },
  ];
  summary.getRow(1).font = header;

  // Daily grid
  const daily = wb.addWorksheet("Daily");
  daily.columns = [
    { header: "Name", key: "name", width: 26 },
    ...data.dateKeys.map((k) => {
      const d = fromDateKey(k);
      return { header: `${d.getUTCDate()} ${WEEKDAYS[d.getUTCDay()].slice(0, 2)}`, key: k, width: 6 };
    }),
  ];
  daily.getRow(1).font = header;

  // Detail
  const detail = wb.addWorksheet("Detail");
  detail.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Name", key: "name", width: 26 },
    { header: "Status", key: "status", width: 12 },
    { header: "Leave", key: "leave", width: 16 },
    { header: "In", key: "in", width: 7 },
    { header: "Out", key: "out", width: 7 },
    { header: "Worked (h)", key: "worked", width: 11 },
    { header: "Late", key: "late", width: 6 },
    { header: "Left Early (min)", key: "early", width: 15 },
    { header: "Overtime (min)", key: "overtime", width: 14 },
    { header: "Missed Checkout", key: "missed", width: 15 },
  ];
  detail.getRow(1).font = header;

  for (const { employee, days } of data.people) {
    const count = (s: AttendanceStatusValue) => days.filter((d) => d.status === s).length;
    summary.addRow({
      name: employee.name,
      team: employee.team ?? "",
      present: count("PRESENT"), wfh: count("WFH"), late: count("LATE"), half: count("HALF_DAY"),
      leave: count("ON_LEAVE"), absent: count("ABSENT"),
      early: days.filter((d) => d.leftEarly).length,
      missed: days.filter((d) => d.missedCheckout).length,
      worked: hours(days.reduce((n, d) => n + (d.workMinutes ?? 0), 0)),
      overtime: hours(days.reduce((n, d) => n + (d.overtimeMinutes ?? 0), 0)),
    });

    daily.addRow({ name: employee.name, ...Object.fromEntries(days.map((d) => [d.dateKey, d.status ? CODES[d.status as AttendanceStatusValue] : ""])) });

    for (const d of days) {
      if (d.isFuture) continue;
      detail.addRow({
        date: d.dateKey,
        name: employee.name,
        status: d.status ? ATTENDANCE_STATUS_LABELS[d.status as AttendanceStatusValue] : "",
        leave: d.leave?.typeName ? `${d.leave.typeName}${d.leave.halfDay ? " (half)" : ""}` : "",
        in: d.checkIn ?? "",
        out: d.checkOut ?? "",
        worked: d.workMinutes != null ? hours(d.workMinutes) : "",
        late: d.isLate ? "Yes" : "",
        early: d.earlyMinutes ?? "",
        overtime: d.overtimeMinutes ?? "",
        missed: d.missedCheckout ? "Yes" : "",
      });
    }
  }

  // Legend under the daily grid.
  daily.addRow({});
  daily.addRow({ name: "Codes: " + (Object.keys(CODES) as AttendanceStatusValue[]).map((s) => `${CODES[s]} = ${ATTENDANCE_STATUS_LABELS[s]}`).join(", ") });
  for (const ws of [summary, daily, detail]) ws.views = [{ state: "frozen", xSplit: ws === detail ? 0 : 1, ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  audit({ actorId: viewer.id, entity: "Attendance", entityId: month, action: "export", changes: { team: data.teamId, people: data.people.length } });

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="attendance-${month}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
