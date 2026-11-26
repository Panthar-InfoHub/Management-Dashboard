// Suggested announcement text for a calendar change ("Everyone works from home
// on Friday, 28 November…"). Pure and client-safe; people can edit it before posting.
import { WEEKDAYS, fromDateKey, type DayKindValue } from "@/lib/attendance/calendar";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function long(key: string) {
  const d = fromDateKey(key);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function short(key: string) {
  const d = fromDateKey(key);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

export function suggestDayAnnouncement(input: { date: string; endDate?: string | null; kind: DayKindValue; name?: string | null }) {
  const start = input.date;
  const end = input.endDate && input.endDate > start ? input.endDate : start;
  const range = end !== start;
  const name = input.name?.trim() || null;
  const when = range ? `${long(start)} to ${long(end)}` : long(start);
  const whenShort = range ? `${short(start)} – ${short(end)}` : `${WEEKDAYS[fromDateKey(start).getUTCDay()].slice(0, 3)} ${short(start)}`;

  switch (input.kind) {
    case "WFH":
      return {
        title: `Work from home${name ? `: ${name}` : ""}, ${whenShort}`,
        body:
          `Everyone works from home ${range ? "from" : "on"} ${when}${name ? ` (${name})` : ""}.\n\n` +
          `Clock in from home as usual. ${range ? "These days are" : "The day is"} recorded as Work From Home, so there's no need to raise a request.`,
      };
    case "HOLIDAY":
      return {
        title: `Holiday${name ? `: ${name}` : ""}, ${whenShort}`,
        body: `The office is closed ${range ? "from" : "on"} ${when}${name ? ` for ${name}` : ""}. There's no need to clock in.`,
      };
    case "OFF":
      return {
        title: `${range ? "Days off" : "Day off"}${name ? `: ${name}` : ""}, ${whenShort}`,
        body: `${when} ${range ? "are days" : "is a day"} off${name ? ` for ${name}` : ""}. There's no need to clock in.`,
      };
    case "OFFICE":
      return {
        title: `${range ? "Office days" : "Office day"}${name ? `: ${name}` : ""}, ${whenShort}`,
        body: `${when} ${range ? "are working days" : "is a working day"} at the office${name ? ` (${name})` : ""}. Clock in at the office as usual.`,
      };
  }
}
