"use client";

import * as React from "react";
import { ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { triggerClass } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { to12h } from "@/lib/attendance/rules";

// A time field: a button showing "10:15 AM" that opens a wheel picker,
// Hour · Minute · AM/PM, with Now, Clear and Done. Value is "HH:mm" (24-hour).
// The button shows the time live; onChange fires once, when the picker closes.
//
// Wheels: no scrollbar; the value in the middle band is the chosen one. Each
// list snaps to the band, fades towards the edges, and has empty space above
// the first and below the last item so both can reach the middle. Scroll,
// drag (touch), click a value, or use ↑/↓ on a focused wheel.
//
// The popover is modal, so it holds the page's scroll lock while open: the
// wheels scroll even inside a dialog (a non-modal popover is blocked by it).

const ROW = 32; // px, one value
const VISIBLE = 7; // rows shown; odd, so one sits in the middle
const PAD = ((VISIBLE - 1) / 2) * ROW; // empty space above the first / below the last

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const MERIDIEM = [false, true] as const;
const pad = (n: number) => String(n).padStart(2, "0");

type Parts = { hour12: number; minute: number; pm: boolean };

function toParts(value: string | undefined): Parts | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  return { hour12: h % 12 === 0 ? 12 : h % 12, minute: Number(m[2]), pm: h >= 12 };
}

const toValue = (p: Parts) => `${pad((p.hour12 % 12) + (p.pm ? 12 : 0))}:${pad(p.minute)}`;

/** Work-hours guess when nothing is picked yet: 8–11 are mornings, 12–7 afternoons. */
const guessPm = (hour12: number) => hour12 === 12 || hour12 < 8;

/** Shown in the middle before anything is chosen (not saved until they move a wheel). */
const START: Parts = { hour12: 10, minute: 0, pm: false };

function Wheel<T extends number | boolean>({
  label, items, selected, fallback, show, onPick,
}: {
  label: string;
  items: readonly T[];
  selected: T | undefined;
  /** Centred when nothing is chosen yet. */
  fallback: T;
  show: (v: T) => string;
  onPick: (v: T) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const settle = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const target = selected ?? fallback;
  const targetIndex = Math.max(0, items.indexOf(target));

  // Our own scrolls (open, Now, Clear, keys, clicks) aren't a choice; only theirs are.
  const auto = React.useRef(false);
  const scrollToIndex = (i: number, behavior: ScrollBehavior) => {
    const el = ref.current;
    if (!el || Math.round(el.scrollTop / ROW) === i) return;
    auto.current = true;
    el.scrollTo({ top: i * ROW, behavior });
  };

  // Keep the chosen value in the band: instantly on open, smoothly after.
  const opened = React.useRef(false);
  React.useLayoutEffect(() => {
    scrollToIndex(targetIndex, opened.current ? "smooth" : "instant");
    opened.current = true;
  }, [targetIndex]);
  React.useEffect(() => () => clearTimeout(settle.current), []);

  // When scrolling stops, the value in the band is the choice.
  const onScroll = () => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      if (auto.current) { auto.current = false; return; }
      const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      if (items[i] !== selected) onPick(items[i]);
    }, 90);
  };

  const step = (by: number) => {
    const i = Math.min(items.length - 1, Math.max(0, targetIndex + by));
    onPick(items[i]);
  };

  return (
    <div
      ref={ref}
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={selected === undefined ? undefined : `${label}-${String(selected)}`}
      onScroll={onScroll}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); step(e.key === "ArrowDown" ? 1 : -1); }
      }}
      className="relative z-10 min-w-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-md outline-none hide-scrollbar focus-visible:ring-2 focus-visible:ring-ring/50"
      style={{
        height: VISIBLE * ROW,
        paddingBlock: PAD,
        // Fade towards the top and bottom edges.
        maskImage: "linear-gradient(to bottom, transparent, black 35%, black 65%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 35%, black 65%, transparent)",
      }}
    >
      {items.map((v, i) => {
        const isSelected = selected !== undefined && v === selected;
        const inBand = i === targetIndex;
        return (
          <div
            key={String(v)}
            id={`${label}-${String(v)}`}
            role="option"
            aria-selected={isSelected}
            onClick={() => { onPick(v); scrollToIndex(i, "smooth"); }}
            className={cn(
              "flex snap-center cursor-pointer items-center justify-center text-base tabular-nums transition-colors select-none",
              inBand ? (isSelected ? "font-semibold text-foreground" : "text-foreground/70") : "text-muted-foreground hover:text-foreground"
            )}
            style={{ height: ROW }}
          >
            {show(v)}
          </div>
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
  const controlled = value !== undefined;
  const [inner, setInner] = React.useState(defaultValue ?? "");
  const current = controlled ? value ?? "" : inner;
  const [open, setOpen] = React.useState(false);
  // While open, the wheels change a draft; the form gets the time once, on close
  // (Done or a click outside), so hints next to the field don't jump around.
  const [draft, setDraft] = React.useState(current);
  const shown = open ? draft : current;
  const parts = toParts(shown);

  const openChange = (next: boolean) => {
    if (next) setDraft(current);
    else if (draft !== current) {
      if (!controlled) setInner(draft);
      onChange?.(draft);
    }
    setOpen(next);
  };
  // Moving one wheel before anything is chosen fills the others from what's shown.
  const set = (patch: Partial<Parts>) => {
    const base: Parts = parts ?? { ...START, pm: guessPm(patch.hour12 ?? START.hour12) };
    setDraft(toValue({ ...base, ...patch }));
  };
  const setNow = () => {
    const now = new Date();
    setDraft(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  };

  return (
    <Popover open={open} onOpenChange={openChange} modal>
      <PopoverTrigger asChild>
        <button id={id} type="button" disabled={disabled} aria-label={ariaLabel} className={cn(triggerClass, className)}>
          <ClockIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn("truncate tabular-nums", !parts && "text-muted-foreground")}>{parts ? to12h(shown) : placeholder}</span>
        </button>
      </PopoverTrigger>
      {name && <input type="hidden" name={name} value={current} />}
      <PopoverContent align="start" className="w-60 gap-0 p-0">
        <div className="relative flex gap-1 px-2 py-1">
          {/* The band: whatever sits here is the chosen value. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-2 rounded-md bg-muted" style={{ top: 4 + PAD, height: ROW }} />
          <Wheel label="Hour" items={HOURS} selected={parts?.hour12} fallback={START.hour12} show={pad} onPick={(hour12) => set({ hour12 })} />
          <Wheel label="Minute" items={MINUTES} selected={parts?.minute} fallback={START.minute} show={pad} onPick={(minute) => set({ minute })} />
          <Wheel label="AM or PM" items={MERIDIEM} selected={parts?.pm} fallback={START.pm} show={(pm) => (pm ? "PM" : "AM")} onPick={(pm) => set({ pm })} />
        </div>
        <div className="flex items-center gap-1 border-t border-border p-2">
          <Button type="button" variant="ghost" size="sm" onClick={setNow}>Now</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setDraft("")}>Clear</Button>
          <Button type="button" size="sm" className="ms-auto" onClick={() => openChange(false)}>Done</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
