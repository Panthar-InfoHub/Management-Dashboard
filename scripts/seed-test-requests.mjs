// Seed one pending request of each kind into the TEST database, to try the
// approval flows by hand (Approvals page, as an Admin or Super Admin).
// Refuses to run against the production database.
//
//   node scripts/seed-test-requests.mjs           add the test cases
//   node scripts/seed-test-requests.mjs --clean   remove them (and what approving them changed)
//
// Every request's reason starts with "[Test]", and seeded days carry the note
// "request test seed", so --clean finds exactly what this script added.
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { Pool } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
const PRODUCTION_HOST = "ep-cold-violet-az87x6ra"; // the live Neon database
const url = process.env.DIRECT_URL ?? "";
const host = new URL(url).host;
if (host.includes(PRODUCTION_HOST)) {
  console.error(`Refusing to seed: ${host} is the production database.`);
  process.exit(1);
}

const TAG = "[Test]";
const NOTE = "request test seed";
const pool = new Pool({ connectionString: url });
const q = async (sql, params) => (await pool.query(sql, params)).rows;
const id = () => `seedtest_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
/**
 * A clock time on a date, office time (India), as the UTC text Prisma stores
 * ("timestamp without time zone" holds UTC). Passing a Date would let the
 * driver write it in this machine's local time instead.
 */
const ist = (date, hhmm) => new Date(`${date}T${hhmm}:00+05:30`).toISOString().replace("T", " ").replace("Z", "");

async function clean() {
  const reqs = await q(`delete from "Request" where reason like $1 returning id`, [`${TAG}%`]);
  const days = await q(`delete from "Attendance" where note = $1 or note like $2 returning id`, [NOTE, `%${TAG}%`]);
  await q(`delete from "Notification" where message like $1`, [`%${TAG}%`]);
  console.log(`Removed ${reqs.length} test requests and ${days.length} test days.`);
}

if (process.argv.includes("--clean")) {
  await clean();
  await pool.end();
  process.exit(0);
}

const existing = await q(`select count(*)::int n from "Request" where reason like $1`, [`${TAG}%`]);
if (existing[0].n > 0) {
  console.log(`Test requests already seeded (${existing[0].n}). Run with --clean first to start over.`);
  await pool.end();
  process.exit(0);
}

const people = Object.fromEntries(
  (await q(`select id, "firstName" from "Employee" where status = 'ACTIVE' and role <> 'SUPER_ADMIN'`))
    .map((e) => [e.firstName.trim(), e.id]),
);
const who = (name) => {
  if (!people[name]) throw new Error(`No active employee named ${name} in this database.`);
  return people[name];
};

/** A recorded day, with its clock-in / clock-out events. */
async function day(name, date, { status, dayKind = "OFFICE", checkIn, checkOut = null, isLate = false, missedCheckout = false }) {
  const employeeId = who(name);
  const inAt = ist(date, checkIn);
  const outAt = checkOut ? ist(date, checkOut) : null;
  const minutes = outAt ? Math.round((Date.parse(`${outAt}Z`) - Date.parse(`${inAt}Z`)) / 60000) : null;
  const rowId = id();
  await q(
    `insert into "Attendance" (id, "employeeId", "officeId", date, status, "dayKind", "checkInAt", "checkOutAt", "workMinutes", "isLate", "missedCheckout", note, "updatedAt")
     values ($1,$2,'office_default',$3,$4,$5,$6,$7,$8,$9,$10,$11, now())`,
    [rowId, employeeId, date, status, dayKind, inAt, outAt, minutes, isLate, missedCheckout, NOTE],
  );
  await q(`insert into "AttendanceEvent" (id, "attendanceId", "employeeId", type, at) values ($1,$2,$3,'CHECK_IN',$4)`, [id(), rowId, employeeId, inAt]);
  if (outAt) await q(`insert into "AttendanceEvent" (id, "attendanceId", "employeeId", type, at) values ($1,$2,$3,'CHECK_OUT',$4)`, [id(), rowId, employeeId, outAt]);
}

/** A pending request. */
async function request(name, kind, date, reason, extra = {}) {
  await q(
    `insert into "Request" (id, "employeeId", kind, "leaveTypeId", "startDate", "endDate", days, reason, status, "workMode", "fixCheckIn", "fixCheckOut", "arriveBy", "updatedAt")
     values ($1,$2,$3,$4,$5,$5,$6,$7,'PENDING',$8,$9,$10,$11, now())`,
    [
      id(), who(name), kind, extra.leaveTypeId ?? null, date, extra.days ?? 0, `${TAG} ${reason}`,
      extra.workMode ?? null,
      extra.fixIn ? ist(date, extra.fixIn) : null,
      extra.fixOut ? ist(date, extra.fixOut) : null,
      extra.arriveBy ? ist(date, extra.arriveBy) : null,
    ],
  );
}

// ── Late Arrival ──
// 1. After the day: came 11:40, now a Half Day.
await day("Aham", "2026-11-26", { status: "HALF_DAY", checkIn: "11:40", checkOut: "19:05", isLate: true });
await request("Aham", "LATE_ARRIVAL", "2026-11-26", "Train from Jhansi was 40 minutes late");
// 2. In advance, for a coming day, arriving by 12:00.
await request("Ankit", "LATE_ARRIVAL", "2026-12-01", "Doctor's appointment in the morning", { arriveBy: "12:00" });
// 3. Said 12:00, actually came 1:30 PM: the approver sees a warning.
await day("Dev", "2026-11-26", { status: "HALF_DAY", checkIn: "13:30", checkOut: "19:00", isLate: true });
await request("Dev", "LATE_ARRIVAL", "2026-11-26", "Bank work in the morning", { arriveBy: "12:00" });

// ── Correct My Time ──
// 4. Missed checkout: clocked in 10:05, never out.
await day("Nandini", "2026-11-26", { status: "PRESENT", checkIn: "10:05", missedCheckout: true });
await request("Nandini", "ATTENDANCE_FIX", "2026-11-26", "Forgot to clock out, left at 7 pm", { workMode: "OFFICE", fixIn: "10:05", fixOut: "19:00" });
// 5. Wrong clock-in: recorded 11:05 (Half Day), really came 10:50.
await day("Nihal", "2026-11-26", { status: "HALF_DAY", checkIn: "11:05", checkOut: "19:00", isLate: true });
await request("Nihal", "ATTENDANCE_FIX", "2026-11-26", "Came at 10:50, the app didn't load", { workMode: "OFFICE", fixIn: "10:50", fixOut: "19:00" });
// 6. Forgot to clock in, and the real time is late (11:40): rules suggest Half Day.
await request("Nikhil", "ATTENDANCE_FIX", "2026-11-26", "Forgot to clock in, came at 11:40", { workMode: "OFFICE", fixIn: "11:40", fixOut: "19:00" });
// 7. Worked from home on an office day.
await request("Sharad", "ATTENDANCE_FIX", "2026-11-26", "Worked from home, forgot to clock in", { workMode: "WFH", fixIn: "10:00", fixOut: "18:30" });
// 8. Today, still working (today is a holiday in this database, so only Present applies).
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
await day("Sneha", today, { status: "PRESENT", dayKind: "HOLIDAY", checkIn: "10:40" });
await request("Sneha", "ATTENDANCE_FIX", today, "Came at 10:00, clocked in late", { workMode: "OFFICE", fixIn: "10:00" });

// ── WFH and Leave ──
// 9. Work from home on a coming office day.
await request("Pulkit", "WFH", "2026-12-02", "Internet technician visiting", { days: 1 });
// 10. One day of casual leave.
await request("Yogendra", "LEAVE", "2026-12-03", "Family function", { leaveTypeId: "leave_casual", days: 1 });

console.log("Seeded 10 test requests. Open Approvals as an Admin or Super Admin.");
await pool.end();
