import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestDayAnnouncement } from "../lib/attendance/day-announcement";

test("suggests a WFH announcement for one day", () => {
  const a = suggestDayAnnouncement({ date: "2026-11-27", kind: "WFH", name: "Office maintenance" });
  assert.equal(a.title, "Work from home: Office maintenance, Fri 27 Nov");
  assert.match(a.body, /^Everyone works from home on Friday, 27 November \(Office maintenance\)\./);
  assert.match(a.body, /no need to raise a request/);
});

test("suggests a range, and ignores an end date before the start", () => {
  const a = suggestDayAnnouncement({ date: "2026-12-30", endDate: "2027-01-02", kind: "HOLIDAY", name: "Year end" });
  assert.equal(a.title, "Holiday: Year end, 30 Dec – 2 Jan");
  assert.equal(a.body, "The office is closed from Wednesday, 30 December to Saturday, 2 January for Year end. There's no need to clock in.");
  const one = suggestDayAnnouncement({ date: "2026-12-05", endDate: "2026-12-01", kind: "OFFICE" });
  assert.equal(one.title, "Office day, Sat 5 Dec");
});
