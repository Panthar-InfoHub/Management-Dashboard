import { Suspense } from "react";
import Link from "next/link";
import { CalendarCheck, Clock, Home, LogIn, Plane, type LucideIcon } from "lucide-react";
import { getDefaultOffice } from "@/lib/attendance/settings";
import { to12h } from "@/lib/attendance/rules";
import { Skeleton } from "@/components/ui/skeleton";

// For employees: what to do, in plain words. No settings, no edge cases.
// The full rules for admins are in docs/attendance-rules.md.

export default function RulesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance Rules</h1>
        <p className="mt-1 text-sm text-muted-foreground">What to do every day, and what to do when something comes up.</p>
      </div>
      <Suspense fallback={<RulesSkeleton />}>
        <Rules />
      </Suspense>
    </div>
  );
}

function RulesSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
    </div>
  );
}

type Rule = { icon: LucideIcon; title: string; lines: string[]; action?: { label: string; href: string } };

async function Rules() {
  const office = await getDefaultOffice();
  const lateDay = office.lateOutcome === "HALF_DAY" ? "a half day" : "late";

  const rules: Rule[] = [
    {
      icon: LogIn,
      title: "Every Day",
      lines: [
        "Clock in when you arrive.",
        "Clock out when you leave for the day. You can't clock in again after that.",
        `Office hours are ${to12h(office.workStart)} to ${to12h(office.workEnd)}.`,
      ],
      action: { label: "Go to My Attendance", href: "/attendance" },
    },
    {
      icon: Clock,
      title: "Be On Time",
      lines: [`Clock in by ${to12h(office.lateAfter)}.`, `If you clock in later, the day counts as ${lateDay}.`],
    },
    {
      icon: Clock,
      title: "Running Late?",
      lines: [
        "Send a Late Arrival request and say why.",
        "You can send it before the day or after it.",
        `If it's approved, the day doesn't count as ${lateDay}.`,
      ],
      action: { label: "Late Arrival", href: "/attendance" },
    },
    {
      icon: CalendarCheck,
      title: "Forgot to Clock In or Out?",
      lines: [
        "Send a Correct My Time request with the right time.",
        "If you don't clock out, the day closes at midnight with no hours.",
      ],
      action: { label: "Correct My Time", href: "/attendance" },
    },
    {
      icon: Home,
      title: "Working From Home?",
      lines: ["Send a WFH request before the day.", "Once approved, you can clock in from home."],
      action: { label: "Request WFH", href: "/attendance" },
    },
    {
      icon: Plane,
      title: "Need a Day Off?",
      lines: ["Apply for leave before the day.", "Don't clock in on a day you're on leave."],
      action: { label: "Apply for Leave", href: "/leave" },
    },
  ];

  return (
    <ol className="space-y-3">
      {rules.map((r) => (
        <li key={r.title} className="flex gap-4 rounded-lg border border-border bg-card p-4 sm:p-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <r.icon className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <h2 className="text-base font-semibold">{r.title}</h2>
            <ul className="space-y-0.5 text-sm text-muted-foreground">
              {r.lines.map((line) => <li key={line}>{line}</li>)}
            </ul>
            {r.action && (
              <Link href={r.action.href} className="inline-block pt-1 text-sm font-medium underline underline-offset-4 hover:text-foreground focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
                {r.action.label}
              </Link>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
