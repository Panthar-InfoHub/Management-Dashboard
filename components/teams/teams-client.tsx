"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LeadPicker } from "@/components/teams/team-dialogs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/panel";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createTeamAction } from "@/lib/actions/team.actions";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type Person = { id: string; firstName: string; lastName: string; avatarUrl: string | null; designation?: string | null };
type Team = {
  id: string; name: string; description: string | null; leadId: string | null;
  lead: Person | null; members: Person[]; projects: { id: string }[];
  openTasks: number; overdueTasks: number; activeProjects: number;
};

function NewTeamDialog({ employees }: { employees: Person[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", description: "", leadId: "" });

  const submit = () => {
    startTransition(async () => {
      try {
        await createTeamAction(form);
        toast.success(`${form.name} created`);
        setOpen(false);
        setForm({ name: "", description: "", leadId: "" });
      } catch (err) {
        toast.error(errorMessage(err, "Team not created. Try again."));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New Team</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New Team</DialogTitle><DialogDescription>Name it, say what it owns and choose who leads it. Add members after.</DialogDescription></DialogHeader>
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="team-name">Team Name</Label>
            <Input id="team-name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Platform" disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="team-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this team own?" disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <Label>Team Lead</Label>
            <LeadPicker value={form.leadId} people={employees} onChange={(v) => setForm({ ...form, leadId: v })} disabled={isPending} />
            <p className="text-xs text-muted-foreground">Leads approve their team&apos;s leave and manage its projects.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending || !form.name.trim() || !form.leadId}>{isPending ? "Creating…" : "Create Team"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "critical" }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn("text-base font-semibold tabular-nums", tone === "critical" && value > 0 && "text-red-600 dark:text-red-400")}>{value}</dd>
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  const shown = team.members.slice(0, 5);
  return (
    <Link
      href={`/teams/${team.id}`}
      className="group flex flex-col rounded-xl border border-border/70 bg-card p-5 shadow-[0_2px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold tracking-tight">{team.name}</h2>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{team.description || "No description yet."}</p>
      </div>

      <dl className="mt-4 grid grid-cols-4 gap-2 border-y border-border/60 py-3">
        <Stat label="Members" value={team.members.length} />
        <Stat label="Projects" value={team.activeProjects} />
        <Stat label="Open" value={team.openTasks} />
        <Stat label="Overdue" value={team.overdueTasks} tone="critical" />
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {team.lead ? (
            <>
              <UserAvatar className="h-7 w-7" user={team.lead} textClassName="text-[10px]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{team.lead.firstName} {team.lead.lastName}</p>
                <p className="text-[11px] text-muted-foreground">Team Lead</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No lead yet</p>
          )}
        </div>
        {shown.length > 0 && (
          <div className="flex -space-x-1.5">
            {shown.map((m) => <UserAvatar key={m.id} className="h-6 w-6 ring-2 ring-card" user={m} textClassName="text-[8px]" />)}
            {team.members.length > shown.length && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-medium ring-2 ring-card">+{team.members.length - shown.length}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export function TeamsClient({ initialTeams, employees, canCreate = false }: { initialTeams: Team[]; employees: Person[]; canCreate?: boolean }) {
  const [query, setQuery] = useState("");
  const teams = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? initialTeams.filter((t) => `${t.name} ${t.description ?? ""} ${t.lead?.firstName ?? ""} ${t.lead?.lastName ?? ""}`.toLowerCase().includes(q)) : initialTeams;
  }, [initialTeams, query]);
  const totals = initialTeams.reduce((s, t) => ({ open: s.open + t.openTasks, overdue: s.overdue + t.overdueTasks }), { open: 0, overdue: 0 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description={`${initialTeams.length} team${initialTeams.length === 1 ? "" : "s"} · ${totals.open} open tasks${totals.overdue ? ` · ${totals.overdue} overdue` : ""}`}
        actions={canCreate ? <NewTeamDialog employees={employees} /> : undefined}
      />

      {initialTeams.length > 3 && (
        <div className="relative max-w-sm">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search teams or leads…" className="pl-8" aria-label="Search teams" />
        </div>
      )}

      {initialTeams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium">No teams yet</p>
          <p className="mt-1 text-sm text-muted-foreground">{canCreate ? "Create a team, then add people and projects to it." : "You aren't in a team yet. An admin can add you."}</p>
        </div>
      ) : teams.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No teams match “{query}”.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => <TeamCard key={t.id} team={t} />)}
        </div>
      )}
    </div>
  );
}
