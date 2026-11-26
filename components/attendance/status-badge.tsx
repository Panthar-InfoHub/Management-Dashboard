import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ATTENDANCE_STATUS_LABELS, type AttendanceStatusValue } from "@/lib/attendance/rules";

export const STATUS_STYLES: Record<AttendanceStatusValue, string> = {
  PRESENT: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  LATE: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  HALF_DAY: "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400",
  ABSENT: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  ON_LEAVE: "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400",
  WFH: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  HOLIDAY: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  WEEKLY_OFF: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

/** Status as a label (never colour alone). */
export function AttendanceStatusBadge({ status, className }: { status: AttendanceStatusValue | null; className?: string }) {
  if (!status) {
    return <Badge variant="outline" className={cn("text-[10px] font-medium text-muted-foreground", className)}>Not in yet</Badge>;
  }
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium", STATUS_STYLES[status], className)}>
      {ATTENDANCE_STATUS_LABELS[status]}
    </Badge>
  );
}
