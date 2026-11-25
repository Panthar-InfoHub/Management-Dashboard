"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Dates are "YYYY-MM-DD" strings, like a native date input, so callers and
// server actions don't change. Pass `name` to submit it with a plain form.

const toDate = (key: string | undefined) => {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return undefined;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toKey = (date: Date) => format(date, "yyyy-MM-dd");

export const triggerClass =
  "flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm transition-colors outline-none hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30";

export function DatePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  disabled,
  clearable,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Show a button that empties the date. */
  clearable?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [inner, setInner] = React.useState(defaultValue ?? "");
  const current = value ?? inner;
  const selected = toDate(current);
  const minDate = toDate(min);
  const maxDate = toDate(max);
  const thisYear = new Date().getFullYear();

  const set = (next: string) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
          <button id={id} type="button" disabled={disabled} aria-label={ariaLabel} className={cn(triggerClass, clearable && current && "pr-8")}>
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? format(selected, "d MMM yyyy") : placeholder}
            </span>
          </button>
        </PopoverTrigger>
        {clearable && current && !disabled && (
          <button
            type="button"
            aria-label="Clear date"
            onClick={() => set("")}
            className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
        {name && <input type="hidden" name={name} value={current} />}
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? maxDate ?? minDate}
          captionLayout="dropdown"
          startMonth={minDate ?? new Date(thisYear - 10, 0)}
          endMonth={maxDate ?? new Date(thisYear + 3, 11)}
          disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
          onSelect={(date) => {
            if (date) set(toKey(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
