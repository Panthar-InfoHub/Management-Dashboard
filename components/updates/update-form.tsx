"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronsUpDown, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { StatusIcon } from "@/components/tasks/task-icons";
import { deleteDailyUpdateAction, getMyUpdateFormAction, saveDailyUpdateAction } from "@/lib/actions/daily-update.actions";
import type { UpdateFormData } from "@/lib/updates/queries";
import { cn, errorMessage } from "@/lib/utils";
import { formatEditedAt, formatUpdateDay } from "@/components/updates/update-card";

const MAX = 4000;
const MAX_TASKS = 20;

/**
 * Add or edit your update for a day you worked. Changing the date loads that
 * day's update. Used on the Daily Updates page and after clocking out.
 */
export function UpdateForm({
  initial,
  onDone,
  onCancel,
  cancelLabel,
  requestedDate,
}: {
  initial: UpdateFormData;
  onDone?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  /** Load this day into the form (e.g. Edit in the history list). */
  requestedDate?: { dateKey: string; nonce: number } | null;
}) {
  const [data, setData] = useState(initial);
  const [body, setBody] = useState(initial.update?.body ?? "");
  const [taskIds, setTaskIds] = useState<string[]>(initial.update?.taskIds ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, startSave] = useTransition();
  const [isLoading, startLoad] = useTransition();
  const busy = isLoading;

  const byId = new Map(data.taskOptions.map((t) => [t.id, t]));
  const dirty = body.trim() !== (data.update?.body ?? "") || [...taskIds].sort().join() !== [...(data.update?.taskIds ?? [])].sort().join();

  const load = (dateKey: string) => {
    if (!dateKey || dateKey === data.dateKey) return;
    startLoad(async () => {
      try {
        const next = await getMyUpdateFormAction(dateKey);
        setData(next);
        setBody(next.update?.body ?? "");
        setTaskIds(next.update?.taskIds ?? []);
      } catch (err) {
        toast.error(errorMessage(err, "Couldn't load that day. Try again."));
      }
    });
  };

  // Edit from the history list: load that day here.
  const lastRequest = useRef<number | null>(null);
  useEffect(() => {
    if (!requestedDate || requestedDate.nonce === lastRequest.current) return;
    lastRequest.current = requestedDate.nonce;
    load(requestedDate.dateKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when a new request comes in
  }, [requestedDate]);

  const toggle = (id: string) => {
    setTaskIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= MAX_TASKS ? ids : [...ids, id]));
  };

  // Optimistic: show it saved straight away, and put it back if the save fails.
  const save = () => {
    const previous = data.update;
    const saved = { body: body.trim(), taskIds, updatedAt: new Date().toISOString() };
    const dateKey = data.dateKey;
    setData((d) => ({ ...d, update: saved }));
    setBody(saved.body);
    onDone?.();
    startSave(async () => {
      try {
        await saveDailyUpdateAction({ date: dateKey, body: saved.body, taskIds: saved.taskIds });
        toast.success(dateKey === data.today ? "Today's update saved" : `Update for ${formatUpdateDay(dateKey)} saved`);
      } catch (err) {
        setData((d) => (d.dateKey === dateKey ? { ...d, update: previous } : d));
        toast.error(errorMessage(err, "Update not saved. Try again."));
      }
    });
  };

  const isToday = data.dateKey === data.today;

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <label htmlFor="update-date" className="text-xs font-semibold text-muted-foreground">Day</label>
          <DatePicker id="update-date" value={data.dateKey} max={data.today} onChange={load} disabled={busy} className="w-44" />
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {isLoading ? "Loading…" : isSaving ? "Saving…" : data.update ? `Saved ${formatEditedAt(data.update.updatedAt)}` : isToday ? "Not added yet today" : "No update for this day yet"}
        </p>
      </div>

      {!data.eligible.ok ? (
        <div className="space-y-3">
          <p role="status" className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2.5 text-sm">{data.eligible.reason}</p>
          {data.update && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{data.update.body}</p>}
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <label htmlFor="update-body" className="text-xs font-semibold text-muted-foreground">
              {isToday ? "What did you work on today?" : `What did you work on, ${formatUpdateDay(data.dateKey)}?`}
            </label>
            <Textarea
              id="update-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX}
              rows={6}
              placeholder="What you worked on, what's finished, and what's still in progress."
              disabled={busy}
            />
            {body.length > MAX - 300 && <p className="text-right text-[11px] text-muted-foreground tabular-nums">{body.length} / {MAX}</p>}
          </div>

          <div className="space-y-1.5">
            <span id="update-tasks-label" className="text-xs font-semibold text-muted-foreground">Linked Tasks (optional)</span>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  aria-labelledby="update-tasks-label"
                  disabled={busy || data.taskOptions.length === 0}
                  className="h-auto min-h-9 w-full justify-between px-2.5 py-1.5 font-normal"
                >
                  <span className="grid min-w-0 flex-1 gap-1 sm:grid-cols-2">
                    {taskIds.length === 0 && (
                      <span className="py-0.5 text-left text-muted-foreground sm:col-span-2">{data.taskOptions.length ? "Link tasks you worked on…" : "No tasks assigned to you"}</span>
                    )}
                    {taskIds.map((id) => {
                      const t = byId.get(id);
                      if (!t) return null;
                      return (
                        <span key={id} title={`${t.key ? `${t.key} ` : ""}${t.title}`} className="flex h-7 w-full min-w-0 items-center gap-1 rounded-md border border-border/70 bg-muted/40 pr-1 pl-1.5 text-xs">
                          {t.key && <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{t.key}</span>}
                          <span className="min-w-0 flex-1 truncate text-left">{t.title}</span>
                          <span role="button" tabIndex={-1} aria-label={`Unlink ${t.title}`} className="shrink-0 rounded p-0.5 hover:bg-muted" onClick={(e) => { e.stopPropagation(); toggle(id); }}>
                            <X className="h-3 w-3" />
                          </span>
                        </span>
                      );
                    })}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(420px,calc(100vw-2rem))] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search your tasks…" />
                  <CommandList className="overscroll-contain">
                    <CommandEmpty>None of your tasks match.</CommandEmpty>
                    <CommandGroup>
                      {data.taskOptions.map((t) => (
                        <CommandItem key={t.id} value={`${t.key ?? ""} ${t.title} ${t.project}`} onSelect={() => toggle(t.id)}>
                          <Check className={cn("h-4 w-4 shrink-0", taskIds.includes(t.id) ? "opacity-100" : "opacity-0")} />
                          <StatusIcon status={t.status} className="h-3.5 w-3.5" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{t.title}</span>
                            <span className="block truncate text-[11px] text-muted-foreground">{[t.key, t.project].filter(Boolean).join(" · ")}</span>
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {data.update && (
                <ConfirmAction
                  trigger={<Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" disabled={busy || isSaving}><Trash2 className="h-3.5 w-3.5" /> Delete Update</Button>}
                  title="Delete this update?"
                  description={`Your update for ${formatUpdateDay(data.dateKey)} will be removed.`}
                  confirmLabel="Delete Update"
                  pendingLabel="Deleting…"
                  destructive
                  onConfirm={async () => {
                    await deleteDailyUpdateAction(data.dateKey);
                    setData((d) => ({ ...d, update: null }));
                    setBody("");
                    setTaskIds([]);
                    return "Update deleted";
                  }}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {onCancel && <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>{cancelLabel ?? "Cancel"}</Button>}
              <Button type="submit" disabled={busy || !body.trim() || !dirty}>{data.update ? "Save Changes" : "Save Update"}</Button>
            </div>
          </div>
        </>
      )}
    </form>
  );
}
