import { test } from "node:test";
import assert from "node:assert/strict";
import { dayKindFor, eachDateKey, fromDateKey, minutesOfDay, parseHHmm, todayKey, type WeekPattern } from "../lib/attendance/calendar";
import { checkGeofence, checkoutFlags, clockInKind, distanceMeters, formatTime, to12h, isSessionExpired, statusForCheckIn, statusForDay, statusForEmptyDay, workedMinutes } from "../lib/attendance/rules";
import { extractPunchPoint, parsePunchAction, parsePunchTimestamp } from "../lib/attendance/punch";

const week: WeekPattern = ["OFF", "OFFICE", "OFFICE", "OFFICE", "OFFICE", "OFFICE", "WFH"];
const office = { latitude: 25.45637, longitude: 78.5322, radiusMeters: 100 };

test("week pattern: Sunday off, Saturday WFH, weekdays office", () => {
  assert.equal(dayKindFor("2026-11-29", week, new Map()), "OFF");
  assert.equal(dayKindFor("2026-11-28", week, new Map()), "WFH");
  assert.equal(dayKindFor("2026-11-27", week, new Map()), "OFFICE");
});

test("a dated override beats the week pattern", () => {
  assert.equal(dayKindFor("2026-11-28", week, new Map([["2026-11-28", "OFFICE"]])), "OFFICE");
  assert.equal(dayKindFor("2026-11-11", week, new Map([["2026-11-11", "HOLIDAY"]])), "HOLIDAY");
});

test("today and clock times are in IST even on a UTC server", () => {
  assert.equal(todayKey("Asia/Kolkata", new Date("2026-11-25T20:00:00Z")), "2026-11-26");
  assert.equal(minutesOfDay("Asia/Kolkata", new Date("2026-11-26T05:31:00Z")), 11 * 60 + 1);
  assert.equal(formatTime(new Date("2026-11-26T04:12:00Z"), "Asia/Kolkata"), "09:42");
});

test("date and time parsing rejects bad input", () => {
  assert.equal(parseHHmm("11:00"), 660);
  assert.throws(() => parseHHmm("25:00"));
  assert.throws(() => fromDateKey("2026-02-30"));
  assert.deepEqual(eachDateKey("2026-12-30", "2027-01-02"), ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
});

test("geofence: inside, outside, vague and missing locations", () => {
  const d = distanceMeters({ lat: 25.45637, lng: 78.5322 }, { lat: 25.45727, lng: 78.5322 });
  assert.ok(d > 95 && d < 105, `about 100 m, got ${d}`);
  assert.equal(checkGeofence({ lat: 25.4564, lng: 78.5322, accuracy: 20 }, office).ok, true);
  assert.deepEqual(checkGeofence({ lat: 25.47, lng: 78.5322 }, office), { ok: false, reason: "outside", distanceMeters: 1516 });
  assert.equal((checkGeofence({ lat: 25.4564, lng: 78.5322, accuracy: 500 }, office) as { reason: string }).reason, "imprecise");
  assert.equal((checkGeofence(null, office) as { reason: string }).reason, "missing");
});

test("late rule: on time, after the cut-off, Late vs Half Day, WFH and days off", () => {
  const base = { lateAfterMinutes: 660, lateOutcome: "HALF_DAY" as const };
  assert.deepEqual(statusForCheckIn({ ...base, dayKind: "OFFICE", minutesNow: 660 }), { status: "PRESENT", isLate: false, needsReview: false });
  assert.deepEqual(statusForCheckIn({ ...base, dayKind: "OFFICE", minutesNow: 661 }), { status: "HALF_DAY", isLate: true, needsReview: true });
  assert.deepEqual(statusForCheckIn({ ...base, lateOutcome: "LATE", dayKind: "OFFICE", minutesNow: 700 }), { status: "LATE", isLate: true, needsReview: false });
  assert.deepEqual(statusForCheckIn({ ...base, dayKind: "WFH", minutesNow: 700 }), { status: "WFH", isLate: true, needsReview: false });
  assert.deepEqual(statusForCheckIn({ ...base, dayKind: "HOLIDAY", minutesNow: 700 }), { status: "PRESENT", isLate: false, needsReview: false });
});

test("worked minutes and empty days", () => {
  assert.equal(workedMinutes(new Date("2026-11-26T04:00:00Z"), new Date("2026-11-26T12:30:00Z")), 510);
  assert.equal(statusForEmptyDay("OFFICE", true), "ABSENT");
  assert.equal(statusForEmptyDay("OFFICE", false), null);
  assert.equal(statusForEmptyDay("OFF", true), "WEEKLY_OFF");
  assert.equal(statusForEmptyDay("HOLIDAY", true), "HOLIDAY");
});

test("a day ends at midnight: yesterday's open clock-in is a missed checkout", () => {
  assert.equal(isSessionExpired("2026-11-25", "2026-11-25"), false);
  assert.equal(isSessionExpired("2026-11-25", "2026-11-26"), true);
});

test("left early and overtime from office hours (10:00–19:00)", () => {
  const hours = { workStartMinutes: 10 * 60, workEndMinutes: 19 * 60 };
  const at = (h: number, m = 0) => h * 60 + m;
  // On time, left at 17:40 → left early 80 m
  assert.deepEqual(checkoutFlags({ ...hours, dayKind: "OFFICE", checkInMinutes: at(10), checkOutMinutes: at(17, 40), workMinutes: 460 }), { leftEarly: true, earlyMinutes: 80, overtimeMinutes: null });
  // Exactly office hours → nothing
  assert.deepEqual(checkoutFlags({ ...hours, dayKind: "OFFICE", checkInMinutes: at(10), checkOutMinutes: at(19), workMinutes: 540 }), { leftEarly: false, earlyMinutes: null, overtimeMinutes: null });
  // In at 09:00, out at 20:15 → 11h15m worked, 2h15m beyond the 9h day
  assert.deepEqual(checkoutFlags({ ...hours, dayKind: "WFH", checkInMinutes: at(9), checkOutMinutes: at(20, 15), workMinutes: 675 }), { leftEarly: false, earlyMinutes: null, overtimeMinutes: 135 });
  // In at 09:34, out at 13:17 → left 5h43m early, and arriving early is NOT overtime
  assert.deepEqual(checkoutFlags({ ...hours, dayKind: "OFFICE", checkInMinutes: at(9, 34), checkOutMinutes: at(13, 17), workMinutes: 223 }), { leftEarly: true, earlyMinutes: 343, overtimeMinutes: null });
  // In at 08:30, out at 17:00 → 8h30m, short of a full day: left early, no overtime
  assert.deepEqual(checkoutFlags({ ...hours, dayKind: "OFFICE", checkInMinutes: at(8, 30), checkOutMinutes: at(17), workMinutes: 510 }), { leftEarly: true, earlyMinutes: 120, overtimeMinutes: null });
  // In at 07:00, out at 18:00 → 11h: a full day and more, so not "left early"; 2h overtime
  assert.deepEqual(checkoutFlags({ ...hours, dayKind: "OFFICE", checkInMinutes: at(7), checkOutMinutes: at(18), workMinutes: 660 }), { leftEarly: false, earlyMinutes: null, overtimeMinutes: 120 });
  // Only 20:00–22:00 → 2h, not a full day: no overtime (and they didn't leave before office end)
  assert.deepEqual(checkoutFlags({ ...hours, dayKind: "OFFICE", checkInMinutes: at(20), checkOutMinutes: at(22), workMinutes: 120 }), { leftEarly: false, earlyMinutes: null, overtimeMinutes: null });
  // Holiday → all overtime
  assert.deepEqual(checkoutFlags({ ...hours, dayKind: "HOLIDAY", checkInMinutes: at(10), checkOutMinutes: at(13), workMinutes: 180 }), { leftEarly: false, earlyMinutes: null, overtimeMinutes: 180 });
});

test("short-day rule: off by default, half day when under the minimum on office days", () => {
  const base = { lateAfterMinutes: 660, lateOutcome: "HALF_DAY" as const, checkInMinutes: 570 }; // 09:30
  assert.equal(statusForDay({ ...base, dayKind: "OFFICE", workMinutes: 120, minFullDayMinutes: null }).status, "PRESENT");
  assert.deepEqual(statusForDay({ ...base, dayKind: "OFFICE", workMinutes: 120, minFullDayMinutes: 240 }), { status: "HALF_DAY", isLate: false, needsReview: true });
  assert.equal(statusForDay({ ...base, dayKind: "OFFICE", workMinutes: 300, minFullDayMinutes: 240 }).status, "PRESENT");
  assert.equal(statusForDay({ ...base, dayKind: "WFH", workMinutes: 60, minFullDayMinutes: 240 }).status, "WFH");
  // Late + LATE outcome + short day → half day; late half day stays half day
  assert.equal(statusForDay({ ...base, checkInMinutes: 700, lateOutcome: "LATE", dayKind: "OFFICE", workMinutes: 60, minFullDayMinutes: 240 }).status, "HALF_DAY");
  assert.equal(statusForDay({ ...base, checkInMinutes: 700, dayKind: "OFFICE", workMinutes: 600, minFullDayMinutes: 240 }).status, "HALF_DAY");
});

test("clock-in kind: flexible WFH, pending and approved WFH, and the office radius", () => {
  const inside = { ok: true as const, distanceMeters: 40 };
  const outside = { ok: false as const, reason: "outside" as const, distanceMeters: 4200 };
  const none = { ok: false as const, reason: "missing" as const };
  const base = { baseKind: "OFFICE" as const, approvedWfh: false, pendingWfh: false, flexible: false };

  // Everyone at the office: an office day.
  assert.deepEqual(clockInKind({ ...base, fence: inside }), { kind: "OFFICE", awaitingWfh: false });
  // Away with no WFH: refused, with the reason.
  assert.deepEqual(clockInKind({ ...base, fence: outside }), { blocked: "outside", distanceMeters: 4200 });
  assert.deepEqual(clockInKind({ ...base, fence: none }), { blocked: "missing", distanceMeters: undefined });
  // Approved WFH: WFH anywhere, even inside the office.
  assert.deepEqual(clockInKind({ ...base, approvedWfh: true, fence: inside }), { kind: "WFH", awaitingWfh: false });
  // Pending WFH: at the office it's an office day; away it waits for the decision.
  assert.deepEqual(clockInKind({ ...base, pendingWfh: true, fence: inside }), { kind: "OFFICE", awaitingWfh: false });
  assert.deepEqual(clockInKind({ ...base, pendingWfh: true, fence: outside }), { kind: "WFH", awaitingWfh: true });
  // Flexible WFH: office when there, WFH anywhere else (no location needed), never awaiting.
  assert.deepEqual(clockInKind({ ...base, flexible: true, fence: inside }), { kind: "OFFICE", awaitingWfh: false });
  assert.deepEqual(clockInKind({ ...base, flexible: true, fence: outside }), { kind: "WFH", awaitingWfh: false });
  assert.deepEqual(clockInKind({ ...base, flexible: true, pendingWfh: true, fence: none }), { kind: "WFH", awaitingWfh: false });
  // Not an office day: the day decides, whatever the location.
  assert.deepEqual(clockInKind({ ...base, baseKind: "HOLIDAY", fence: outside }), { kind: "HOLIDAY", awaitingWfh: false });
});

test("times are shown in 12-hour form", () => {
  assert.equal(to12h("09:34"), "9:34 AM");
  assert.equal(to12h("13:17"), "1:17 PM");
  assert.equal(to12h("00:05"), "12:05 AM");
  assert.equal(to12h("12:00"), "12:00 PM");
  assert.equal(to12h(null), "");
});

test("punch helpers: timestamp, action, and lat/lng extraction ignore accuracy", () => {
  const fallback = new Date("2026-11-26T04:00:00Z");
  assert.equal(parsePunchTimestamp(undefined, fallback).getTime(), fallback.getTime());
  assert.equal(parsePunchTimestamp("2026-11-26T10:05:00+05:30").toISOString(), "2026-11-26T04:35:00.000Z");
  assert.equal(parsePunchTimestamp(1795667700).toISOString(), "2026-11-26T04:35:00.000Z");
  assert.throws(() => parsePunchTimestamp("not-a-date"));

  assert.equal(parsePunchAction(undefined), "AUTO");
  assert.equal(parsePunchAction("in"), "CHECK_IN");
  assert.equal(parsePunchAction("check_out"), "CHECK_OUT");
  assert.throws(() => parsePunchAction("unknown"));

  const fromTop = extractPunchPoint({ lat: 25.4564, lng: 78.5322, accuracy: 9999 });
  assert.deepEqual(fromTop, { lat: 25.4564, lng: 78.5322, accuracy: null });
  assert.equal(checkGeofence(fromTop, office).ok, true);

  const fromNested = extractPunchPoint({ location: { lat: 25.47, lng: 78.5322, accuracy: 500 } });
  assert.deepEqual(fromNested, { lat: 25.47, lng: 78.5322, accuracy: null });
  assert.equal((checkGeofence(fromNested, office) as { reason: string }).reason, "outside");

  assert.equal(extractPunchPoint({}), null);
});
