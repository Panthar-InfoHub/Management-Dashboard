import { formatDuration } from "@/lib/attendance/rules";
import { cn } from "@/lib/utils";

type Flags = {
  isLate: boolean;
  missedCheckout: boolean;
  leftEarly: boolean;
  earlyMinutes: number | null;
  overtimeMinutes: number | null;
  reviewPending: boolean;
  awaitingWfh?: boolean;
  lateExcused?: boolean;
};

/** Small text tags for a day: late, left early, overtime, missed checkout, review, WFH awaiting, late excused. */
export function DayFlags({ day, className }: { day: Flags; className?: string }) {
  const tags: { text: string; tone: string }[] = [];
  if (day.missedCheckout) tags.push({ text: "Missed checkout", tone: "text-red-600 dark:text-red-400" });
  if (day.isLate) tags.push({ text: "Late", tone: "text-amber-700 dark:text-amber-400" });
  if (day.leftEarly) tags.push({ text: `Left ${day.earlyMinutes ? formatDuration(day.earlyMinutes) : ""} early`.replace("  ", " "), tone: "text-amber-700 dark:text-amber-400" });
  if (day.overtimeMinutes) tags.push({ text: `+${formatDuration(day.overtimeMinutes)} overtime`, tone: "text-emerald-700 dark:text-emerald-400" });
  if (day.reviewPending) tags.push({ text: "Pending review", tone: "text-muted-foreground" });
  if (day.awaitingWfh) tags.push({ text: "Awaiting WFH approval", tone: "text-muted-foreground" });
  if (day.lateExcused) tags.push({ text: "Late excused", tone: "text-muted-foreground" });
  if (tags.length === 0) return null;

  return (
    <span className={cn("inline-flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-medium leading-tight", className)}>
      {tags.map((t) => <span key={t.text} className={t.tone}>{t.text}</span>)}
    </span>
  );
}
