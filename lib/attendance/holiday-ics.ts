// Reads a public-holiday calendar (iCalendar / .ics, e.g. Google's "Holidays in
// India") into a simple list. Pure: no fetching, so it can be tested.

export type FeedHoliday = {
  /** "YYYY-MM-DD" */
  date: string;
  name: string;
  /** Gazetted public holiday, or an observance (festival many don't take off). */
  kind: "PUBLIC" | "OBSERVANCE";
  /** The date may still move (e.g. moon-sighting festivals). */
  tentative: boolean;
  /** Republic Day, Independence Day, Gandhi Jayanti: every company gives these. */
  national: boolean;
};

const NATIONAL = /republic day|independence day|gandhi jayanti/i;

/** Long lines in .ics files wrap onto lines starting with a space; join them back. */
function unfold(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function field(block: string, name: string) {
  const m = new RegExp(`^${name}(?:;[^:\\n]*)?:(.*)$`, "m").exec(block);
  return m ? m[1].replace(/\\,/g, ",").replace(/\;/g, ";").replace(/\\n/g, "\n").trim() : null;
}

/** Holidays in one year, one entry per date (names on the same day are joined). */
export function parseHolidayIcs(text: string, year: number): FeedHoliday[] {
  const byDate = new Map<string, FeedHoliday>();
  for (const block of unfold(text).split("BEGIN:VEVENT").slice(1)) {
    const start = field(block, "DTSTART");
    const summary = field(block, "SUMMARY");
    if (!start || !summary || !/^\d{8}/.test(start)) continue;
    const date = `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}`;
    if (Number(start.slice(0, 4)) !== year) continue;

    const description = field(block, "DESCRIPTION") ?? "";
    const kind: FeedHoliday["kind"] = /public holiday/i.test(description) ? "PUBLIC" : "OBSERVANCE";
    const tentative = /tentative/i.test(summary) || /tentative/i.test(description);
    const name = summary.replace(/\s*\(tentative\)\s*/i, "").trim();

    const prev = byDate.get(date);
    if (!prev) {
      byDate.set(date, { date, name, kind, tentative, national: NATIONAL.test(name) });
    } else if (!prev.name.split(" / ").includes(name)) {
      // Two on one day. A public holiday is named after public holidays only;
      // observances on that day are dropped from the name.
      if (kind === "OBSERVANCE" && prev.kind === "PUBLIC") continue;
      const replace = kind === "PUBLIC" && prev.kind === "OBSERVANCE";
      byDate.set(date, {
        date,
        name: replace ? name : `${prev.name} / ${name}`,
        kind,
        tentative: replace ? tentative : prev.tentative && tentative,
        national: (replace ? false : prev.national) || NATIONAL.test(name),
      });
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
