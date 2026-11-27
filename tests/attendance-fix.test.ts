import { test } from "node:test";
import assert from "node:assert/strict";
import { fixOutcomeChoices, fixOutcomeFields, statusForDay, suggestedFixOutcome } from "../lib/attendance/rules";

const rules = { lateAfterMinutes: 11 * 60, lateOutcome: "HALF_DAY" as const, minFullDayMinutes: null };

test("fix choices follow the day kind", () => {
  assert.deepEqual(fixOutcomeChoices("OFFICE"), ["PRESENT", "LATE", "HALF_DAY"]);
  assert.deepEqual(fixOutcomeChoices("WFH"), ["WFH", "WFH_LATE", "HALF_DAY"]);
  assert.deepEqual(fixOutcomeChoices("HOLIDAY"), ["PRESENT"]);
});

test("fix suggestion: 11:03 on an office day is a Half Day, 10:52 is Present", () => {
  const late = statusForDay({ dayKind: "OFFICE", checkInMinutes: 11 * 60 + 3, workMinutes: 477, ...rules });
  assert.equal(suggestedFixOutcome("OFFICE", late), "HALF_DAY");
  const onTime = statusForDay({ dayKind: "OFFICE", checkInMinutes: 10 * 60 + 52, workMinutes: 488, ...rules });
  assert.equal(suggestedFixOutcome("OFFICE", onTime), "PRESENT");
  const wfhLate = statusForDay({ dayKind: "WFH", checkInMinutes: 11 * 60 + 3, workMinutes: 477, ...rules });
  assert.equal(suggestedFixOutcome("WFH", wfhLate), "WFH_LATE");
});

test("approver's choice wins: Present after the cut-off is an excused late arrival", () => {
  assert.deepEqual(fixOutcomeFields("PRESENT", true), { status: "PRESENT", isLate: false, lateExcused: true });
  assert.deepEqual(fixOutcomeFields("PRESENT", false), { status: "PRESENT", isLate: false, lateExcused: false });
  assert.deepEqual(fixOutcomeFields("LATE", true), { status: "LATE", isLate: true, lateExcused: false });
  assert.deepEqual(fixOutcomeFields("HALF_DAY", true), { status: "HALF_DAY", isLate: true, lateExcused: false });
  assert.deepEqual(fixOutcomeFields("WFH", true), { status: "WFH", isLate: false, lateExcused: true });
  assert.deepEqual(fixOutcomeFields("WFH_LATE", true), { status: "WFH", isLate: true, lateExcused: false });
});

test("late arrival: approved as Present or Late, never changes an on-time day or a day off", async () => {
  const { lateArrivalFields } = await import("../lib/attendance/rules");
  assert.deepEqual(lateArrivalFields("OFFICE", "PRESENT", true), { status: "PRESENT", isLate: false, lateExcused: true });
  assert.deepEqual(lateArrivalFields("OFFICE", "LATE", true), { status: "LATE", isLate: true, lateExcused: false });
  assert.deepEqual(lateArrivalFields("WFH", "PRESENT", true), { status: "WFH", isLate: false, lateExcused: true });
  assert.deepEqual(lateArrivalFields("WFH", "LATE", true), { status: "WFH", isLate: true, lateExcused: false });
  assert.equal(lateArrivalFields("OFFICE", "PRESENT", false), null);
  assert.equal(lateArrivalFields("HOLIDAY", "PRESENT", true), null);
});

test("late arrival covers a clock-in up to arrive-by + grace", async () => {
  const { lateArrivalCovers } = await import("../lib/attendance/rules");
  const noon = 12 * 60;
  assert.equal(lateArrivalCovers(noon + 15, noon, 15), true);
  assert.equal(lateArrivalCovers(noon + 16, noon, 15), false);
  assert.equal(lateArrivalCovers(17 * 60, noon, 15), false);
  assert.equal(lateArrivalCovers(17 * 60, null, 15), true);
});

test("grace moves the late cut-off: 11:00 + 15 → 11:15 on time, 11:16 late", async () => {
  const { lateCutoffMinutes, lastOnTime, statusForCheckIn } = await import("../lib/attendance/rules");
  const cutoff = lateCutoffMinutes("11:00", 15);
  assert.equal(lastOnTime("11:00", 15), "11:15");
  assert.equal(statusForCheckIn({ dayKind: "OFFICE", minutesNow: 11 * 60 + 15, lateAfterMinutes: cutoff, lateOutcome: "HALF_DAY" }).status, "PRESENT");
  assert.equal(statusForCheckIn({ dayKind: "OFFICE", minutesNow: 11 * 60 + 16, lateAfterMinutes: cutoff, lateOutcome: "HALF_DAY" }).status, "HALF_DAY");
});
