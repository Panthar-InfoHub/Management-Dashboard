"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { FormField, FormSection } from "@/components/ui/form-section";
import { LeadPicker } from "@/components/teams/team-dialogs";
import { createProjectAction } from "@/lib/actions/project.actions";
import { errorMessage } from "@/lib/errors";
import { normaliseProjectKey, suggestProjectKey } from "@/lib/tasks/keys";
import { cn } from "@/lib/utils";

const STATUSES = [
  { id: "PLANNING", label: "Planning" },
  { id: "ACTIVE", label: "Active" },
  { id: "PAUSED", label: "Paused" },
] as const;
const PRIORITIES = [
  { id: "LOW", label: "Low", dot: "bg-neutral-400" },
  { id: "MEDIUM", label: "Medium", dot: "bg-neutral-500" },
  { id: "HIGH", label: "High", dot: "bg-orange-500" },
  { id: "CRITICAL", label: "Critical", dot: "bg-red-500" },
] as const;

function Segmented<T extends string>({ value, options, onChange, label, disabled }: { value: T; options: readonly { id: T; label: string; dot?: string }[]; onChange: (v: T) => void; label: string; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-border bg-background p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          disabled={disabled}
          onClick={() => onChange(o.id)}
          className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none", value === o.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
        >
          {o.dot && <span className={cn("h-1.5 w-1.5 rounded-full", o.dot)} />}{o.label}
        </button>
      ))}
    </div>
  );
}

export function NewProjectForm({
  employees,
  teams,
}: {
  employees: { id: string; firstName: string; lastName: string; avatarUrl?: string | null; designation?: string | null; email?: string | null }[];
  teams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    key: "", // "" = follow the name
    description: "",
    status: "PLANNING" as (typeof STATUSES)[number]["id"],
    priority: "MEDIUM" as (typeof PRIORITIES)[number]["id"],
    leadId: "",
    teamId: teams.length === 1 ? teams[0].id : "",
    startDate: "",
    endDate: "",
    addTeamMembers: true,
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const key = form.key || (form.name ? suggestProjectKey(form.name) : "");
  const keyInvalid = !!form.key && !normaliseProjectKey(form.key);
  const ready = form.name.trim() && form.leadId && form.teamId && !keyInvalid;

  const submit = () => {
    if (!ready) return;
    startTransition(async () => {
      try {
        const res = await createProjectAction({
          name: form.name,
          key,
          description: form.description,
          status: form.status,
          priority: form.priority,
          leadId: form.leadId,
          teamId: form.teamId,
          startDate: form.startDate ? new Date(`${form.startDate}T00:00:00`) : undefined,
          endDate: form.endDate ? new Date(`${form.endDate}T23:59:59.999`) : undefined,
          addTeamMembers: form.addTeamMembers,
        });
        toast.success(`${form.name} created`);
        router.push(`/projects/${res.project.id}`);
      } catch (err) {
        toast.error(errorMessage(err, "Project not created. Try again."));
      }
    });
  };

  return (
    <form
      className="mx-auto w-full max-w-4xl px-6 py-6"
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); submit(); } }}
    >
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Back">
            <Link href="/projects"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">New Project</h1>
            <p className="text-xs text-muted-foreground">Name, team and lead are required. Everything else can come later.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" disabled={isPending}><Link href="/projects">Cancel</Link></Button>
          <Button type="submit" disabled={isPending || !ready} title="⌘/Ctrl + Enter">{isPending ? "Creating…" : "Create Project"}</Button>
        </div>
      </div>

      <FormSection title="Project" description="What it is, and the short code its tasks use.">
        <FormField label="Name" htmlFor="project-name">
          <Input id="project-name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Janta Nivesh V2" className="h-10 text-base" autoFocus disabled={isPending} />
        </FormField>
        <FormField
          label="Task ID Key"
          htmlFor="project-key"
          hint={keyInvalid ? <span className="text-red-600 dark:text-red-400">2–6 letters or digits, starting with a letter.</span> : <>Tasks get IDs like <span className="font-mono">{key || "KEY"}-1</span>. Suggested from the name; change it if you like.</>}
        >
          <Input
            id="project-key"
            value={key}
            onChange={(e) => set({ key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) })}
            placeholder="KEY"
            aria-invalid={keyInvalid}
            className="w-32 font-mono uppercase"
            disabled={isPending}
          />
        </FormField>
        <FormField label="Description" htmlFor="project-desc">
          <Textarea id="project-desc" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Goal, scope, client, links…" className="min-h-28" disabled={isPending} />
        </FormField>
      </FormSection>

      <FormSection title="Ownership" description="The team it belongs to and who leads it.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Team">
            <Select value={form.teamId} onValueChange={(v) => set({ teamId: v })} disabled={isPending}>
              <SelectTrigger className="h-[52px] w-full"><SelectValue placeholder="Choose a team" /></SelectTrigger>
              <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Project Lead">
            <LeadPicker value={form.leadId} people={employees} onChange={(v) => set({ leadId: v })} disabled={isPending} />
          </FormField>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <Switch checked={form.addTeamMembers} onCheckedChange={(c) => set({ addTeamMembers: c })} disabled={isPending} className="mt-0.5" />
          <span>
            <span className="block font-medium">Add the team&apos;s members to the project</span>
            <span className="block text-xs text-muted-foreground">So they can be assigned tasks straight away. You can change members later.</span>
          </span>
        </label>
      </FormSection>

      <FormSection title="Planning" description="All optional. Add a deadline later if it isn't clear yet.">
        <FormField label="Status">
          <Segmented label="Status" value={form.status} options={STATUSES} onChange={(v) => set({ status: v })} disabled={isPending} />
        </FormField>
        <FormField label="Priority">
          <Segmented label="Priority" value={form.priority} options={PRIORITIES} onChange={(v) => set({ priority: v })} disabled={isPending} />
        </FormField>
        <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
          <FormField label="Start Date" htmlFor="project-start">
            <DatePicker id="project-start" value={form.startDate} max={form.endDate || undefined} onChange={(v) => set({ startDate: v })} placeholder="Not set" clearable disabled={isPending} />
          </FormField>
          <FormField label="Deadline" htmlFor="project-end">
            <DatePicker id="project-end" value={form.endDate} min={form.startDate || undefined} onChange={(v) => set({ endDate: v })} placeholder="No deadline" clearable disabled={isPending} />
          </FormField>
        </div>
      </FormSection>
    </form>
  );
}
