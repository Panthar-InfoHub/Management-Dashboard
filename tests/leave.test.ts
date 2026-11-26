import { test } from "node:test";
import assert from "node:assert/strict";
import { availableDays, proratedAllowance, requestDays } from "../lib/leave/rules";
import { zonedDateTime } from "../lib/attendance/calendar";

test("leave counts working days only; half day is 0.5", () => {
  const week = [{ dayKind: "OFFICE" }, { dayKind: "OFFICE" }, { dayKind: "WFH" }, { dayKind: "OFF" }, { dayKind: "HOLIDAY" }] as const;
  assert.equal(requestDays("LEAVE", [...week], false), 3);
  assert.equal(requestDays("LEAVE", [{ dayKind: "OFFICE" }], true), 0.5);
  assert.equal(requestDays("LEAVE", [{ dayKind: "OFF" }], true), 0);
  assert.equal(requestDays("WFH", [...week], false), 2);
  assert.equal(requestDays("ATTENDANCE_FIX", [...week], false), 0);
});

test("allowance is prorated from the start month and rounded down to half days", () => {
  assert.equal(proratedAllowance(12, 2027, "2026-12-01"), 12); // started an earlier year
  assert.equal(proratedAllowance(12, 2026, "2026-12-01"), 1);  // 1 month left
  assert.equal(proratedAllowance(12, 2026, "2026-07-15"), 6);  // Jul–Dec
  assert.equal(proratedAllowance(6, 2026, "2026-10-01"), 1.5); // 3 months of 6/yr
  assert.equal(proratedAllowance(12, 2026, "2027-01-01"), 0);  // not started yet
});

test("available days add adjustments and subtract used and pending", () => {
  const b = { allowed: 12, adjusted: -1, used: 4 };
  assert.equal(availableDays(b), 7);
  assert.equal(availableDays(b, 2.5), 4.5);
});

test("a local time in IST maps to the right UTC instant", () => {
  assert.equal(zonedDateTime("2026-11-25", "09:30", "Asia/Kolkata").toISOString(), "2026-11-25T04:00:00.000Z");
  assert.equal(zonedDateTime("2026-11-25", "00:15", "Asia/Kolkata").toISOString(), "2026-11-24T18:45:00.000Z");
});
