"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { updateTeamAction, manageTeamMembersAction } from "@/lib/actions/team.actions";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

export type Person = { id: string; firstName: string; lastName: string; avatarUrl?: string | null; designation?: string | null; email?: string | null };
type Team = { id: string; name: string; description: string | null; leadId: string | null; members: Person[] };

const fullName = (p: Person) => `${p.firstName} ${p.lastName}`.trim();
const matches = (p: Person, q: string) => `${fullName(p)} ${p.designation ?? ""} ${p.email ?? ""}`.toLowerCase().includes(q.trim().toLowerCase());

function PersonLine({ person, meta }: { person: Person; meta?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <UserAvatar className="h-8 w-8 shrink-0" user={person} textClassName="text-xs" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{fullName(person)}{meta}</p>
        {(person.designation || person.email) && <p className="truncate text-xs text-muted-foreground">{person.designation || person.email}</p>}
      </div>
    </div>
  );
}

/** Searchable person picker with avatars, for the team lead. */
export function LeadPicker({ value, people, onChange, disabled }: { value: string; people: Person[]; onChange: (id: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const current = people.find((p) => p.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="h-auto w-full justify-between bg-background px-3 py-2 font-normal">
          {current ? <PersonLine person={current} /> : <span className="text-muted-foreground">Choose a team lead</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command filter={(v, search) => (v.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder="Search people…" />
          <CommandList>
            <CommandEmpty>No one found.</CommandEmpty>
            {people.map((p) => (
              <CommandItem key={p.id} value={`${fullName(p)} ${p.designation ?? ""} ${p.email ?? ""}`} onSelect={() => { onChange(p.id); setOpen(false); }}>
                <PersonLine person={p} />
                <Check className={cn("h-4 w-4 shrink-0", p.id === value ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function EditTeamDialog({ team, people, open, onOpenChange }: { team: Team; people: Person[]; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [isPending, startTransition] = useTransition();
  const initial = { name: team.name, description: team.description ?? "", leadId: team.leadId ?? "" };
  const [data, setData] = useState(initial);
  const dirty = JSON.stringify(data) !== JSON.stringify(initial);
  const leadChanged = data.leadId !== initial.leadId;
  const newLeadIsMember = team.members.some((m) => m.id === data.leadId);

  const save = () => {
    startTransition(async () => {
      try {
        await updateTeamAction(team.id, { ...data, name: data.name.trim(), description: data.description.trim() });
        toast.success(`${data.name.trim()} updated`);
        onOpenChange(false);
      } catch (err) {
        toast.error(errorMessage(err, "Team not updated. Try again."));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>Name, purpose and who leads it.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(e) => { e.preventDefault(); if (dirty && data.name.trim() && data.leadId) save(); }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="team-name">Team Name</Label>
            <Input id="team-name" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} maxLength={80} disabled={isPending} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="team-desc" rows={3} value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} maxLength={500} placeholder="What this team works on" disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <Label>Team Lead</Label>
            <LeadPicker value={data.leadId} people={people} onChange={(id) => setData({ ...data, leadId: id })} disabled={isPending} />
            <p className="text-xs text-muted-foreground">
              {leadChanged && !newLeadIsMember
                ? "They'll be added to the team. The current lead stays a member."
                : "The lead can edit the team, manage members and approve their requests."}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending || !dirty || !data.name.trim() || !data.leadId}>{isPending ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Team members: the shared members dialog, saving to the team. */
export function ManageMembersDialog({ team, people, open, onOpenChange }: { team: Team; people: Person[]; open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <MembersDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Manage Members"
      description={`Add or remove people from ${team.name}. The lead always stays in the team.`}
      people={people}
      members={team.members}
      leadId={team.leadId}
      onSave={async (ids) => {
        await manageTeamMembersAction(team.id, ids);
        return `${team.name} members updated`;
      }}
    />
  );
}

/**
 * Members dialog shared by teams and projects: current members on top
 * (removable, lead pinned), everyone else below with an Add button.
 */
export function MembersDialog({
  open, onOpenChange, title, description, people, members: initialMembers, leadId, onSave, rowAction,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  people: Person[];
  members: Person[];
  leadId: string | null;
  /** Gets the final ids (lead included); returns the success toast. */
  onSave: (ids: string[]) => Promise<string>;
  /** Optional extra control on a saved member's row (e.g. project permissions). */
  rowAction?: (person: Person) => React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const original = useMemo(() => initialMembers.map((m) => m.id), [initialMembers]);
  const [ids, setIds] = useState<string[]>(original);
  const [query, setQuery] = useState("");

  const byId = useMemo(() => new Map([...people, ...initialMembers].map((p) => [p.id, p])), [people, initialMembers]);
  const members = ids.map((id) => byId.get(id)).filter(Boolean) as Person[];
  members.sort((a, b) => (a.id === leadId ? -1 : b.id === leadId ? 1 : fullName(a).localeCompare(fullName(b))));
  const others = people.filter((p) => !ids.includes(p.id) && (query.trim() === "" || matches(p, query)));

  const added = ids.filter((id) => !original.includes(id)).length;
  const removed = original.filter((id) => !ids.includes(id)).length;
  const dirty = added + removed > 0;

  const save = () => {
    startTransition(async () => {
      try {
        const message = await onSave([...new Set([...ids, ...(leadId ? [leadId] : [])])]);
        toast.success(message);
        onOpenChange(false);
      } catch (err) {
        toast.error(errorMessage(err, "Members not updated. Try again."));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">Members · {members.length}</h3>
            <ul className="divide-y divide-border/60 rounded-lg border border-border/70">
              {members.map((p) => {
                const isLead = p.id === leadId;
                const isNew = !original.includes(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                    <PersonLine
                      person={p}
                      meta={isLead ? <span className="ml-2 text-xs font-normal text-muted-foreground">Lead</span> : isNew ? <span className="ml-2 text-xs font-normal text-emerald-600">New</span> : null}
                    />
                    {!isLead && !isNew && rowAction?.(p)}
                    {!isLead && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" aria-label={`Remove ${fullName(p)}`} disabled={isPending} onClick={() => setIds((l) => l.filter((x) => x !== p.id))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">Add people</h3>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, role or email" aria-label="Search people to add" className="pl-9" />
            </div>
            {others.length === 0 ? (
              <p className="px-1 py-3 text-center text-xs text-muted-foreground">{query ? "No one matches that search." : "Everyone is already a member."}</p>
            ) : (
              <ul className="max-h-64 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border/70">
                {others.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                    <PersonLine person={p} />
                    <Button variant="outline" size="sm" className="h-7 shrink-0 gap-1 text-xs" disabled={isPending} onClick={() => setIds((l) => [...l, p.id])}>
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <DialogFooter className="m-0 rounded-b-xl items-center border-t border-border/60 px-6 py-3 sm:justify-between">
          <p className="text-xs text-muted-foreground tabular-nums">
            {dirty ? [added && `${added} to add`, removed && `${removed} to remove`].filter(Boolean).join(" · ") : "No changes"}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={save} disabled={isPending || !dirty}>{isPending ? "Saving…" : "Save Members"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Chips with avatars plus an "Add Person" search list: pick any number of people. */
export function PeoplePicker({ people, value, onChange, disabled, addLabel = "Add Person" }: {
  people: Person[]; value: string[]; onChange: (ids: string[]) => void; disabled?: boolean; addLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const chosen = value.map((id) => people.find((p) => p.id === id)).filter(Boolean) as Person[];
  const rest = people.filter((p) => !value.includes(p.id));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chosen.map((p) => (
        <span key={p.id} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-background pl-0.5 pr-1 text-sm">
          <UserAvatar className="h-6 w-6" user={p} textClassName="text-[9px]" />
          {fullName(p)}
          <button type="button" onClick={() => onChange(value.filter((id) => id !== p.id))} disabled={disabled} aria-label={`Remove ${fullName(p)}`} className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {rest.length > 0 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 rounded-full border-dashed text-xs" disabled={disabled}>
              <Plus className="h-3 w-3" /> {addLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <Command>
              <CommandInput placeholder="Search people…" />
              <CommandList>
                <CommandEmpty>No one found.</CommandEmpty>
                {rest.map((p) => (
                  <CommandItem key={p.id} value={`${fullName(p)} ${p.designation ?? ""} ${p.email ?? ""}`} onSelect={() => { onChange([...value, p.id]); setOpen(false); }}>
                    <PersonLine person={p} />
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
