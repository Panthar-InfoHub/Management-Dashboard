// Status and priority marks, drawn as small SVGs so they read at a glance and
// don't rely on colour alone: each status has its own shape (empty, partly
// filled, checked, crossed), each priority its own bar count.
import { cn } from "@/lib/utils";

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "DONE"] as const;
export const TASK_PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export const STATUS_META: Record<string, { label: string; color: string; fill: number }> = {
  TODO: { label: "To Do", color: "text-neutral-400", fill: 0 },
  IN_PROGRESS: { label: "In Progress", color: "text-blue-500", fill: 0.5 },
  REVIEW: { label: "Review", color: "text-violet-500", fill: 0.75 },
  TESTING: { label: "Testing", color: "text-amber-500", fill: 0.9 },
  DONE: { label: "Done", color: "text-emerald-600", fill: 1 },
  CANCELLED: { label: "Cancelled", color: "text-neutral-400", fill: -1 },
};

export const PRIORITY_META: Record<string, { label: string }> = {
  CRITICAL: { label: "Critical" },
  HIGH: { label: "High" },
  MEDIUM: { label: "Medium" },
  LOW: { label: "Low" },
};

/** Ring that fills as work moves along; a check for Done, a cross for Cancelled. */
export function StatusIcon({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.TODO;
  const cls = cn("h-4 w-4 shrink-0", meta.color, className);
  if (meta.fill === 1) {
    return (
      <svg viewBox="0 0 16 16" className={cls} aria-hidden>
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M5 8.2 7 10.2 11 6" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (meta.fill === -1) {
    return (
      <svg viewBox="0 0 16 16" className={cls} aria-hidden>
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M5.8 5.8 10.2 10.2M10.2 5.8 5.8 10.2" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  // Pie slice from 12 o'clock, clockwise, for the share of the way done.
  const angle = meta.fill * 2 * Math.PI;
  const r = 4;
  const x = 8 + r * Math.sin(angle);
  const y = 8 - r * Math.cos(angle);
  const large = meta.fill > 0.5 ? 1 : 0;
  return (
    <svg viewBox="0 0 16 16" className={cls} aria-hidden>
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={meta.fill === 0 ? "2.2 1.6" : undefined} />
      {meta.fill > 0 && <path d={`M8 8 L8 ${8 - r} A${r} ${r} 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`} fill="currentColor" />}
    </svg>
  );
}

/** Signal bars: more bars, more urgent. Critical is a filled square with "!". */
export function PriorityIcon({ priority, className }: { priority: string; className?: string }) {
  const cls = cn("h-4 w-4 shrink-0", className);
  if (priority === "CRITICAL") {
    return (
      <svg viewBox="0 0 16 16" className={cn(cls, "text-red-600")} aria-hidden>
        <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="currentColor" />
        <path d="M8 4.5v4.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.3" r="1" fill="white" />
      </svg>
    );
  }
  const level = priority === "HIGH" ? 3 : priority === "MEDIUM" ? 2 : 1;
  return (
    <svg viewBox="0 0 16 16" className={cn(cls, priority === "HIGH" ? "text-orange-500" : "text-foreground/70")} aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={2.5 + i * 4} y={10 - i * 3} width="3" height={4 + i * 3} rx="1" fill="currentColor" opacity={i < level ? 1 : 0.2} />
      ))}
    </svg>
  );
}
