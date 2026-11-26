import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHolidayIcs } from "../lib/attendance/holiday-ics";

const ics = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20270126", "SUMMARY:Republic Day", "DESCRIPTION:Public holiday", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20270310", "SUMMARY:Ramzan Id (tentative)", "DESCRIPTION:Public holiday\\nDate is tentative and may change.", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20270216", "SUMMARY:Vasant Panchami", "DESCRIPTION:Observance\\nTo hide observances\\, go to Google Calendar Setting", " s > Holidays in India", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20270815", "SUMMARY:Milad un-Nabi (tentative)", "DESCRIPTION:Public holiday", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20270815", "SUMMARY:Independence Day", "DESCRIPTION:Public holiday", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261225", "SUMMARY:Christmas", "DESCRIPTION:Public holiday", "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

test("holiday feed: one year, public vs observance, tentative, national, same-day merge", () => {
  const rows = parseHolidayIcs(ics, 2027);
  assert.deepEqual(rows.map((r) => r.date), ["2027-01-26", "2027-02-16", "2027-03-10", "2027-08-15"]); // 2026 dropped, sorted
  assert.deepEqual(rows[0], { date: "2027-01-26", name: "Republic Day", kind: "PUBLIC", tentative: false, national: true });
  assert.equal(rows[1].kind, "OBSERVANCE");
  assert.deepEqual(rows[2], { date: "2027-03-10", name: "Ramzan Id", kind: "PUBLIC", tentative: true, national: false });
  // Two on one day: both names, national, not tentative (Independence Day is fixed).
  assert.deepEqual(rows[3], { date: "2027-08-15", name: "Milad un-Nabi / Independence Day", kind: "PUBLIC", tentative: false, national: true });
});
