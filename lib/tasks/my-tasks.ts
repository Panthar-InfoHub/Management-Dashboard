// Grouping for My Tasks. Pure, client-safe and tested.
import { fromDateKey, toDateKey } from "@/lib/attendance/calendar";

export type DueBucket = "overdue" | "today" | "week" | "later" | "none";

export const DUE_BUCKETS: { id: DueBucket; label: string; empty: string }[] = [
  { id: "overdue", label: "Overdue", empty: "Nothing overdue." },
  { id: "today", label: "Today", empty: "Nothing due today." },
  { id: "week", label: "Next 7 Days", empty: "Nothing due this week." },
  { id: "later", label: "Later", empty: "Nothing due later." },
  { id: "none", label: "No Due Date", empty: "Every task has a date." },
];

/** Which group a due date ("YYYY-MM-DD" in office time) falls in. */
export function dueBucket(dueKey: string | null, todayKey: string): DueBucket {
  if (!dueKey) return "none";
  if (dueKey < todayKey) return "overdue";
  if (dueKey === todayKey) return "today";
  const weekEnd = fromDateKey(todayKey);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  return dueKey <= toDateKey(weekEnd) ? "week" : "later";
}
