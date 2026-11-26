"use client";

import * as React from "react";
import { ClockIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { triggerClass } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

// Times are "HH:mm" (24-hour) strings, like a native time input; they are
// shown as 12-hour times ("10:30 AM").

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const pad = (n: number) => String(n).padStart(2, "0");

function parse(value: string | undefined) {
  const m = value?.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  return { hour12: h % 12 === 0 ? 12 : h % 12, minute: Number(m[2]), pm: h >= 12 };
}

export function formatTime12(value: string | undefined): string {
  const t = parse(value);
  return t ? `${t.hour12}:${pad(t.minute)} ${t.pm ? "PM" : "AM"}` : "";
}

function Column<T extends string | number>({ items, selected, label, onPick }: { items: T[]; selected: T | undefined; label: (v: T) => string; onPick: (v: T) => void }) {
  return (
    <div className="flex max-h-56 w-14 flex-col gap-0.5 overflow-y-auto p-1 [scrollbar-width:thin]">
      {items.map((v) => {
        const isSelected = v === selected;
        return (
          <button
            key={v}
            type="button"
            ref={isSelected ? (el) => el?.scrollIntoView({ block: "center" }) : undefined}
            onClick={() => onPick(v)}
            className={cn(
              "h-7 shrink-0 rounded-md text-sm tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
          >
            {label(v)}
          </button>
        );
      })}
    </div>
  );
}

export function TimePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  placeholder = "Pick a time",
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [inner, setInner] = React.useState(defaultValue ?? "");
  const current = value ?? inner;
  const t = parse(current);

  const set = (next: { hour12?: number; minute?: number; pm?: boolean }) => {
    const base = t ?? { hour12: 9, minute: 0, pm: false };
    const merged = { ...base, ...next };
    const h24 = (merged.hour12 % 12) + (merged.pm ? 12 : 0);
    const out = `${pad(h24)}:${pad(merged.minute)}`;
    if (value === undefined) setInner(out);
    onChange?.(out);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button id={id} type="button" disabled={disabled} aria-label={ariaLabel} className={cn(triggerClass, className)}>
          <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("truncate tabular-nums", !t && "text-muted-foreground")}>{t ? formatTime12(current) : placeholder}</span>
        </button>
      </PopoverTrigger>
      {name && <input type="hidden" name={name} value={current} />}
      <PopoverContent className="flex w-auto divide-x divide-border p-0" align="start">
        <Column items={HOURS} selected={t?.hour12} label={String} onPick={(hour12) => set({ hour12 })} />
        <Column items={MINUTES} selected={t?.minute} label={pad} onPick={(minute) => set({ minute })} />
        <Column items={["AM", "PM"]} selected={t ? (t.pm ? "PM" : "AM") : undefined} label={String} onPick={(p) => set({ pm: p === "PM" })} />
      </PopoverContent>
    </Popover>
  );
}
