"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MonthNav, monthTitle } from "@/components/attendance/month-nav";
import { UpdateForm } from "@/components/updates/update-form";
import { UpdateCard, formatUpdateDay, historyStat } from "@/components/updates/update-card";
import type { UpdateFormData, getPersonUpdates } from "@/lib/updates/queries";

type History = Awaited<ReturnType<typeof getPersonUpdates>>;

/** Your form, then your updates by month. Edit loads a day into the form in place. */
export function MyUpdates({ form, history }: { form: UpdateFormData; history: History }) {
  const [requested, setRequested] = useState<{ dateKey: string; nonce: number } | null>(null);
  const formRef = useRef<HTMLElement>(null);
  const href = (month: string | null) => `/updates?view=mine${month ? `&month=${month}` : ""}`;

  const edit = (dateKey: string) => {
    setRequested((r) => ({ dateKey, nonce: (r?.nonce ?? 0) + 1 }));
    formRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="space-y-8">
      <section ref={formRef} className="scroll-mt-20 rounded-xl border border-border/70 bg-card p-4 shadow-[0_2px_2px_rgba(0,0,0,0.04)] sm:p-6">
        <UpdateForm initial={form} requestedDate={requested} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Your Updates</h2>
            <p className="text-xs text-muted-foreground tabular-nums">{historyStat(history.updates.length, history.workedDays, history.month)}</p>
          </div>
          <MonthNav monthKey={history.month} currentMonth={history.currentMonth} href={href} />
        </div>
        {history.updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates in {monthTitle(history.month)}. Add one above for any day you worked.</p>
        ) : (
          history.updates.map((u) => (
            <UpdateCard
              key={u.id}
              header={<h3 className="text-sm font-medium">{formatUpdateDay(u.dateKey)}</h3>}
              body={u.body}
              tasks={u.tasks}
              updatedAt={u.updatedAt}
              actions={<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => edit(u.dateKey)}>Edit</Button>}
            />
          ))
        )}
      </section>
    </div>
  );
}
