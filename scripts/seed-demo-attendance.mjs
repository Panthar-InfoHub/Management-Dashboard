// Fill the DEMO database with realistic attendance and requests for testing.
// Refuses to run against the production database. Run once:
//
//   node scripts/seed-demo-attendance.mjs
//
// Creates, for 2–25 Nov 2026 and every tracked active employee (not Super
// Admins): normal days, late half days (recent ones waiting for review),
// left-early days, overtime, missed checkouts, Saturday WFH and a few absences;
// plus approved / rejected / pending leave, WFH and attendance-fix requests.
import { config } from "dotenv";
import { Pool } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
const PRODUCTION_HOST = "ep-cold-violet-az87x6ra"; // the live Neon database
const url = process.env.DIRECT_URL ?? "";
const host = new URL(url).host;
if (host.includes(PRODUCTION_HOST)) {
  console.error(`Refusing to seed: ${host} is the production database.`);
  process.exit(1);
}

const FROM = "2026-11-02", TO = "2026-11-25", REVIEW_FROM = "2026-11-19";
const pool = new Pool({ connectionString: url });
const q = async (sql, params) => (await pool.query(sql, params)).rows;

const SEED_REASONS = [
  "Sister's wedding", "Internet technician visiting", "Not feeling great", "Family trip to Orchha",
  "Doctor's appointment in the morning", "Waiting for a parcel delivery", "Travelling back from home", "Forgot to clock out, left at 7 pm",
];
const existingSeed = await q(`select count(*)::int n from "Attendance" where note = 'demo seed'`);
if (existingSeed[0].n > 0) {
  if (!process.argv.includes("--force")) {
    console.log(`Demo data already seeded (${existingSeed[0].n} days). Run with --force to replace it.`);
    await pool.end();
    process.exit(0);
  }
  // Replace the earlier sample: its days, requests, the leave it used and its notifications.
  await q(`delete from "Attendance" where note = 'demo seed'`);
  const approvedLeave = await q(`select "employeeId", days from "Request" where reason = $1 and status = 'APPROVED'`, [SEED_REASONS[0]]);
  for (const r of approvedLeave) await q(`update "LeaveBalance" set used = greatest(0, used - $2) where "employeeId" = $1 and "leaveTypeId" = 'leave_casual' and year = 2026`, [r.employeeId, r.days]);
  await q(`delete from "Request" where reason = any($1)`, [SEED_REASONS]);
  await q(`delete from "Notification" where message like 'Sample data:%'`);
  console.log("Removed the previous sample data.");
}

// ── helpers ──
const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const istToUtc = (dateKey, minutes) => new Date(Date.parse(`${dateKey}T00:00:00Z`) + (minutes - 330) * 60_000);
const days = [];
for (let t = Date.parse(`${FROM}T00:00:00Z`); t <= Date.parse(`${TO}T00:00:00Z`); t += 86_400_000) days.push(new Date(t).toISOString().slice(0, 10));
function rng(seed) { // mulberry32
  let a = 0; for (const ch of seed) a = (a * 31 + ch.charCodeAt(0)) >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const between = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

const [office] = await q(`select id, "workStart", "workEnd", "lateAfter", "lateOutcome"::text, "weekPattern"::text[] as "weekPattern" from "Office" where "isDefault" order by "createdAt" limit 1`);
const overrides = new Map((await q(`select to_char(date,'YYYY-MM-DD') d, kind::text from "CalendarDay" where "officeId" is null`)).map((r) => [r.d, r.kind]));
const start = toMin(office.workStart), end = toMin(office.workEnd), late = toMin(office.lateAfter);
const kindOf = (d) => overrides.get(d) ?? office.weekPattern[new Date(`${d}T00:00:00Z`).getUTCDay()];

const people = await q(`select id, "firstName" || ' ' || "lastName" as name, to_char("joinDate",'YYYY-MM-DD') as join from "Employee" where status = 'ACTIVE' and role <> 'SUPER_ADMIN' order by "firstName"`);
const byName = (n) => { const p = people.find((x) => x.name.replace(/\s+/g, " ").trim().startsWith(n)); if (!p) throw new Error(`No employee ${n}`); return p; };
const [krish] = await q(`select id from "Employee" where "firstName" = 'Krish' limit 1`);
const sneha = byName("Sneha");

// Days skipped for approved leave / taken as approved WFH.
const leaveDays = new Map([[byName("Nihal").id, new Set(["2026-11-12", "2026-11-13"])]]);
const wfhDays = new Map([[byName("Nikhil").id, new Set(["2026-11-18"])]]);

let created = 0;
const missedByPerson = new Map();
for (const p of people) {
  for (const d of days) {
    if (d < p.join) continue;
    const kind = kindOf(d);
    if (kind === "OFF" || kind === "HOLIDAY") continue;
    if (leaveDays.get(p.id)?.has(d)) continue;
    const exists = await q(`select 1 from "Attendance" where "employeeId" = $1 and date = $2::date`, [p.id, d]);
    if (exists.length) continue;

    const r = rng(p.id + d);
    const x = r();
    const isWfh = kind === "WFH" || wfhDays.get(p.id)?.has(d);
    let inM, outM, status = isWfh ? "WFH" : "PRESENT", isLate = false, review = null, missed = false;

    if (isWfh) {
      if (x < 0.12) continue; // didn't work that Saturday
      inM = between(r, start, start + 30); outM = between(r, end - 30, end + 15);
    } else if (x < 0.04) {
      continue; // absent
    } else if (x < 0.13) {
      inM = between(r, late + 5, late + 45); outM = between(r, end, end + 30); // late → half day
      isLate = true; status = office.lateOutcome === "HALF_DAY" ? "HALF_DAY" : "LATE";
      review = status === "HALF_DAY" ? (d >= REVIEW_FROM ? "PENDING" : "APPROVED") : null;
    } else if (x < 0.19) {
      inM = between(r, start - 10, start + 10); outM = between(r, end - 150, end - 60); // left early
    } else if (x < 0.22) {
      inM = between(r, start - 5, start + 15); outM = null; missed = true; // missed checkout
    } else if (x < 0.29) {
      inM = between(r, start - 70, start - 30); outM = between(r, end + 45, end + 120); // overtime
    } else {
      // A normal day: on time, leaves at office end (no left-early, no overtime).
      inM = between(r, start, start + 25); outM = end;
    }

    const work = outM != null ? outM - inM : null;
    const before = outM != null ? Math.max(0, Math.min(start, outM) - inM) : 0;
    const after = outM != null ? Math.max(0, outM - Math.max(end, inM)) : 0;
    const overtime = before + after || null;
    const leftEarly = outM != null && outM < end;
    const att = await q(
      `insert into "Attendance" (id, "employeeId", "officeId", date, status, "dayKind", "checkInAt", "checkOutAt", "workMinutes",
         "isLate", "missedCheckout", "leftEarly", "earlyMinutes", "overtimeMinutes", "reviewStatus", "reviewedById", "reviewedAt", note, "updatedAt")
       values (gen_random_uuid()::text, $1, $2, $3::date, $4::"AttendanceStatus", $5::"DayKind", $6, $7, $8, $9, $10, $11, $12, $13, $14::"RequestStatus", $15, $16, 'demo seed', now())
       returning id`,
      [p.id, office.id, d, status, isWfh ? "WFH" : "OFFICE", istToUtc(d, inM), outM != null ? istToUtc(d, outM) : null, work,
       isLate, missed, leftEarly, leftEarly ? end - outM : null, overtime, review, review === "APPROVED" ? krish.id : null, review === "APPROVED" ? istToUtc(d, 1200) : null]
    );
    await q(`insert into "AttendanceEvent" (id, "attendanceId", "employeeId", type, at) values (gen_random_uuid()::text, $1, $2, 'CHECK_IN', $3)`, [att[0].id, p.id, istToUtc(d, inM)]);
    if (outM != null) await q(`insert into "AttendanceEvent" (id, "attendanceId", "employeeId", type, at) values (gen_random_uuid()::text, $1, $2, 'CHECK_OUT', $3)`, [att[0].id, p.id, istToUtc(d, outM)]);
    if (missed && !missedByPerson.has(p.id)) missedByPerson.set(p.id, { date: d, inM });
    created++;
  }
}

// ── Requests ──
async function request(emp, kind, startKey, endKey, opts = {}) {
  await q(
    `insert into "Request" (id, "employeeId", kind, "leaveTypeId", "startDate", "endDate", "halfDay", days, reason, status, "decidedById", "decidedAt", "decisionNote", "fixCheckIn", "fixCheckOut", "updatedAt")
     values (gen_random_uuid()::text, $1, $2::"RequestKind", $3, $4::date, $5::date, $6::"HalfDayPart", $7, $8, $9::"RequestStatus", $10, $11, $12, $13, $14, now())`,
    [emp.id, kind, opts.type ?? null, startKey, endKey, opts.half ?? null, opts.days ?? 0, opts.reason, opts.status ?? "PENDING",
     opts.by ?? null, opts.by ? new Date() : null, opts.note ?? null, opts.fixIn ?? null, opts.fixOut ?? null]
  );
}

const nihal = byName("Nihal"), sharad = byName("Sharad"), nikhil = byName("Nikhil");
await request(nihal, "LEAVE", "2026-11-12", "2026-11-13", { type: "leave_casual", days: 2, reason: "Sister's wedding", status: "APPROVED", by: krish.id, note: "Enjoy!" });
await q(
  `insert into "LeaveBalance" (id, "employeeId", "leaveTypeId", year, allowed, used, "updatedAt") values (gen_random_uuid()::text, $1, 'leave_casual', 2026, 12, 2, now())
   on conflict ("employeeId", "leaveTypeId", year) do update set used = "LeaveBalance".used + 2`,
  [nihal.id]
);
await request(nikhil, "WFH", "2026-11-18", "2026-11-18", { days: 1, reason: "Internet technician visiting", status: "APPROVED", by: krish.id });
await request(sharad, "WFH", "2026-11-20", "2026-11-20", { days: 1, reason: "Not feeling great", status: "REJECTED", by: sneha.id, note: "Please take sick leave instead" });

// Pending — these show up in Approvals for HR (Sneha) and admins.
await request(byName("Aham"), "LEAVE", "2026-12-03", "2026-12-04", { type: "leave_casual", days: 2, reason: "Family trip to Orchha" });
await request(byName("Pulkit"), "LEAVE", "2026-11-27", "2026-11-27", { type: "leave_sick", half: "FIRST_HALF", days: 0.5, reason: "Doctor's appointment in the morning" });
await request(byName("Dev"), "WFH", "2026-12-01", "2026-12-01", { days: 1, reason: "Waiting for a parcel delivery" });
await request(byName("Yogendra"), "WFH", "2026-12-02", "2026-12-02", { days: 1, reason: "Travelling back from home" });
const nandini = byName("Nandini");
const miss = missedByPerson.get(nandini.id) ?? [...missedByPerson.entries()][0]?.[1];
const fixFor = missedByPerson.has(nandini.id) ? nandini : people.find((p) => missedByPerson.has(p.id));
if (fixFor && miss) {
  await request(fixFor, "ATTENDANCE_FIX", miss.date, miss.date, { reason: "Forgot to clock out, left at 7 pm", fixIn: istToUtc(miss.date, miss.inM), fixOut: istToUtc(miss.date, end + 5) });
}

// Let approvers know there is work waiting.
const approvers = [sneha.id, krish.id];
for (const id of approvers) {
  await q(`insert into "Notification" (id, "recipientId", type, title, message, "actionUrl") values (gen_random_uuid()::text, $1, 'REQUEST', 'Requests waiting', 'Sample data: 5 requests and some half days are waiting for review.', '/approvals')`, [id]);
}

const pendingReviews = await q(`select count(*)::int n from "Attendance" where "reviewStatus" = 'PENDING'`);
console.log(`Seeded ${created} attendance days for ${people.length} people (${FROM} → ${TO}) on ${host}.`);
console.log(`Requests: 3 decided, 5 pending (incl. 1 attendance fix${fixFor ? ` for ${fixFor.name}` : ""}). Half days waiting for review: ${pendingReviews[0].n}.`);
await pool.end();
