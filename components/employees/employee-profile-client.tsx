"use client";
import type { getEmployeeById } from "@/lib/queries/employee.queries";
import type { Jsonify } from "@/lib/types";
import { DatePicker } from "@/components/ui/date-picker";
import { errorMessage } from "@/lib/errors";

import { PromoteDialog } from "@/components/employees/promote-dialog";
import { OffboardDialog } from "@/components/employees/offboard-dialog";
import type { OffboardingChecklist } from "@/lib/employees/offboarding";

const LEDGER_LABELS: Record<string, string> = {
  JOINED: "Joined", PROMOTION: "Promotion", TRANSFER: "Transfer", TITLE_CHANGE: "Title change", REHIRED: "Rehired", EXITED: "Left",
};

import { ACCESS_ROLES, EMPLOYMENT_TYPE_LABELS, ROLE_LABELS, type AccessRole, type EmploymentTypeValue } from "@/lib/access";
import { EmployeeAccessPanel, type PresetOption } from "@/components/employees/employee-access-panel";

import { useState, useTransition } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Copy } from "lucide-react";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { toast } from "sonner";
import { 
  updateEmployeeAction, 
  generateEmployeeCodeAction, 
  reserveEmployeeSequenceAction,
} from "@/lib/actions/employee.actions";

const STATUS: Record<string, { label: string; dot: string }> = {
  ACTIVE: { label: "Active", dot: "bg-emerald-500" },
  ON_LEAVE: { label: "On Leave", dot: "bg-amber-500" },
  INACTIVE: { label: "Inactive", dot: "bg-muted-foreground" },
};

function tenure(join: string | Date, now: number) {
  const months = Math.max(0, Math.floor((now - new Date(join).getTime()) / (30.44 * 86_400_000)));
  if (months < 1) return "New";
  const y = Math.floor(months / 12), m = months % 12;
  return [y && `${y}y`, m && `${m}m`].filter(Boolean).join(" ");
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

function CodeRow({ label, code, canGenerate, disabled, onCopy, onGenerate }: {
  label: string; code: string | null; canGenerate: boolean; disabled: boolean; onCopy: (t: string) => void; onGenerate: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {code ? (
        <span className="flex items-center gap-1">
          <span className="font-mono text-xs">{code}</span>
          <button type="button" onClick={() => onCopy(code)} aria-label={`Copy ${label} code`} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
            <Copy className="h-3 w-3" />
          </button>
        </span>
      ) : canGenerate ? (
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onGenerate} disabled={disabled}>Generate</Button>
      ) : (
        <span className="text-xs text-muted-foreground">Not generated</span>
      )}
    </div>
  );
}

const formatDate = (dateString: string | Date) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const day = d.getDate().toString().padStart(2, '0');
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export function EmployeeProfileClient({
  employee,
  canEdit = false,
  canAssignRoles = false,
  canOffboard = false,
  access = null,
  teams = [],
  checklist = null,
  leave = null,
  canSetFlexibleWfh = false,
}: {
  employee: Jsonify<NonNullable<Awaited<ReturnType<typeof getEmployeeById>>>>;
  canEdit?: boolean;
  canAssignRoles?: boolean;
  canOffboard?: boolean;
  access?: { presets: PresetOption[]; assignedPresetIds: string[]; personalPermissions: string[] } | null;
  teams?: { id: string; name: string }[];
  checklist?: OffboardingChecklist | null;
  /** Leave balance block, rendered by the page when the viewer may see it. */
  leave?: React.ReactNode;
  /** Admins editing someone else may let them work from home without a request. */
  canSetFlexibleWfh?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [now] = useState(() => Date.now());

  // Modals state
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState({
    role: employee.role as AccessRole,
    employmentType: (employee.employmentType ?? "FULL_TIME") as EmploymentTypeValue,
    designation: employee.designation || "",
    joinDate: employee.joinDate ? new Date(employee.joinDate).toISOString().split("T")[0] : "",
    flexibleWfh: !!employee.flexibleWfh,
  });



  const [codeType, setCodeType] = useState<"PANTHAR" | "KAVACHX" | null>(null);
  const [reservedSeq, setReservedSeq] = useState<number | null>(null);

  const handleUpdate = () => {
    startTransition(() => {
      const { role, flexibleWfh, ...rest } = editingEmp;
      updateEmployeeAction(employee.id, {
        ...rest,
        ...(canAssignRoles && { role }),
        ...(canSetFlexibleWfh && { flexibleWfh }),
      }).then(() => {
        setEditOpen(false);
        toast.success("Profile updated");
      }).catch((e) => toast.error(errorMessage(e)));
    });
  };

  const handleStartGenerating = (type: "PANTHAR" | "KAVACHX") => {
    setCodeType(type);
    setReservedSeq(null);
    startTransition(() => {
      reserveEmployeeSequenceAction(type).then((seq) => {
        setReservedSeq(seq);
      }).catch((e) => toast.error(errorMessage(e)));
    });
  };

  const handleGenerateCode = () => {
    if (!codeType || !reservedSeq) return;
    
    // Convert current ISO string to YYYY-MM-DD to match expected server input
    const joinDateStr = new Date(employee.joinDate).toISOString().split("T")[0];
    
    startTransition(() => {
      generateEmployeeCodeAction(employee.id, codeType, joinDateStr).then(() => {
        setCodeType(null);
        setReservedSeq(null);
        toast.success("Code generated");
      }).catch((e) => toast.error(errorMessage(e)));
    });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  const memberships = (employee.teamMemberships ?? []) as { team: { id: string; name: string; leadId: string | null } }[];
  const records = (employee.employmentRecords ?? []) as { id: string; designation: string | null; type: string | null; startDate: string; endDate: string | null; reason: string | null }[];
  const status = STATUS[employee.status as string] ?? STATUS.INACTIVE;
  const role = ROLE_LABELS[employee.role as AccessRole] ?? employee.role;
  const fullAccess = employee.role === "ADMIN" || employee.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar className="h-16 w-16 shrink-0" user={employee} textClassName="text-xl" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{employee.firstName} {employee.lastName}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{[employee.designation || "No designation", role].join(" · ")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-2 py-0.5 font-medium">
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} /> {status.label}
              </span>
              <span className="rounded-md border border-border/70 bg-background px-2 py-0.5 text-muted-foreground">
                {EMPLOYMENT_TYPE_LABELS[(employee.employmentType ?? "FULL_TIME") as EmploymentTypeValue]}
              </span>
              {employee.flexibleWfh && (
                <span className="rounded-md border border-border/70 bg-background px-2 py-0.5 text-muted-foreground" title="Works from home without requests">Flexible WFH</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit Profile
            </Button>
          )}
          {employee.status === "ACTIVE" && canEdit && (
            <PromoteDialog
              employee={{
                ...employee,
                teamIds: memberships.map((m) => m.team.id),
                ledTeamIds: memberships.filter((m) => m.team.leadId === employee.id).map((m) => m.team.id),
              }}
              teams={teams}
              canAssignRoles={canAssignRoles}
            />
          )}
          {employee.status === "ACTIVE" && canOffboard && checklist && (
            <OffboardDialog employeeId={employee.id} name={employee.firstName} checklist={checklist} />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Employment History" description="Roles, promotions and transfers, newest first">
            {records.length === 0 ? (
              <p className="text-sm text-muted-foreground">No records yet.</p>
            ) : (
              <ol className="relative space-y-5 border-l border-border/70 pl-5">
                {records.map((r, i) => (
                  <li key={r.id} className="relative">
                    <span className={`absolute -left-[25px] top-1.5 h-2 w-2 rounded-full ring-4 ring-card ${i === 0 && !r.endDate ? "bg-foreground" : "bg-border"}`} />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                      <p className="text-sm font-medium">
                        {r.designation || "Employee"}
                        {r.type && <span className="ml-2 text-xs font-normal text-muted-foreground">{LEDGER_LABELS[r.type] ?? r.type}</span>}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatDate(r.startDate)} – {r.endDate ? formatDate(r.endDate) : "Present"}
                      </p>
                    </div>
                    {r.reason && <p className="mt-0.5 text-xs text-muted-foreground">{r.reason}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          {leave}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Panel title="Details">
            <dl className="space-y-3 text-sm">
              <Fact label="Email">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate">{employee.email}</span>
                  <button type="button" onClick={() => copy(employee.email)} aria-label="Copy email" className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground">
                    <Copy className="h-3 w-3" />
                  </button>
                </span>
              </Fact>
              {employee.phone && <Fact label="Phone">{employee.phone}</Fact>}
              <Fact label="Joined">
                {formatDate(employee.joinDate)}
                <span className="ml-1.5 text-xs text-muted-foreground">{tenure(employee.joinDate, now)}</span>
              </Fact>
              <Fact label="Access">{role}</Fact>
              <Fact label="Teams">
                {memberships.length === 0 ? (
                  <span className="text-muted-foreground">None yet</span>
                ) : (
                  <span className="flex flex-wrap justify-end gap-1">
                    {memberships.map((m) => (
                      <Link key={m.team.id} href={`/teams/${m.team.id}`} className="rounded-md border border-border/70 px-1.5 py-0.5 text-xs hover:bg-muted">
                        {m.team.name}{m.team.leadId === employee.id ? " · Lead" : ""}
                      </Link>
                    ))}
                  </span>
                )}
              </Fact>
            </dl>
          </Panel>

          <Panel title="Employee Codes">
            <div className="space-y-3">
              <CodeRow label="Panthar" code={employee.pantharCode} canGenerate={canEdit} disabled={isPending} onCopy={copy} onGenerate={() => handleStartGenerating("PANTHAR")} />
              <CodeRow label="KavachX" code={employee.kavachXCode} canGenerate={canEdit} disabled={isPending} onCopy={copy} onGenerate={() => handleStartGenerating("KAVACHX")} />
            </div>
          </Panel>

          {access ? (
            <Panel title="Permissions" description="Company-wide access beyond their own work">
              <EmployeeAccessPanel
                employeeId={employee.id}
                employeeName={employee.firstName}
                presets={access.presets}
                assignedPresetIds={access.assignedPresetIds}
                personalPermissions={access.personalPermissions}
              />
            </Panel>
          ) : fullAccess ? (
            <Panel title="Permissions">
              <p className="text-sm text-muted-foreground">{role}s have every permission.</p>
            </Panel>
          ) : null}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Designation</label>
              <Input value={editingEmp.designation} onChange={e => setEditingEmp({...editingEmp, designation: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Date of Joining</label>
              <DatePicker value={editingEmp.joinDate} onChange={(v) => setEditingEmp({ ...editingEmp, joinDate: v })} aria-label="Date of joining" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Employment Type</label>
              <Select value={editingEmp.employmentType} onValueChange={(v) => setEditingEmp({...editingEmp, employmentType: v as EmploymentTypeValue})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentTypeValue[]).map(t => <SelectItem key={t} value={t}>{EMPLOYMENT_TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {canAssignRoles && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Access Role</label>
                <Select value={editingEmp.role} onValueChange={(v) => setEditingEmp({...editingEmp, role: v as AccessRole})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {ACCESS_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {canSetFlexibleWfh && (
              <label className="flex items-start gap-3 rounded-lg border border-border/70 px-3 py-2.5">
                <Switch checked={editingEmp.flexibleWfh} onCheckedChange={(v) => setEditingEmp({ ...editingEmp, flexibleWfh: v })} className="mt-0.5" />
                <span className="text-sm">
                  <span className="font-medium">Can work from home without asking</span>
                  <span className="block text-xs text-muted-foreground">Clock in from anywhere: at the office it records Present, elsewhere WFH. No WFH requests needed. They&apos;re notified, and it&apos;s in the Audit log.</span>
                </span>
              </label>
            )}
            <Button className="w-full" onClick={handleUpdate} disabled={isPending}>{isPending ? "Saving…" : "Save Changes"}</Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Generate Code Dialog */}
      <Dialog open={codeType !== null} onOpenChange={(v) => !v && setCodeType(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Generate {codeType === "PANTHAR" ? "Panthar" : "KavachX"} Code</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4 text-center">
            {!reservedSeq ? (
              <div className="space-y-3">
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded mx-auto" />
                <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                <div className="h-10 w-full bg-muted animate-pulse rounded-md mt-4" />
              </div>
            ) : (
               <div className="space-y-4">
                 <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/40 p-4 text-sm font-medium">
                   <span className="text-xs text-muted-foreground uppercase">Generated Preview</span>
                   <span className="font-mono text-xl font-semibold">
                     {codeType === "PANTHAR" ? "PTHUB" : "KAVACHX"}-
                     {String(new Date(employee.joinDate).getDate()).padStart(2, "0")}
                     {String(new Date(employee.joinDate).getMonth() + 1).padStart(2, "0")}
                     {String(new Date(employee.joinDate).getFullYear()).slice(-2)}
                     {reservedSeq}
                   </span>
                 </div>
                 <Button onClick={handleGenerateCode} disabled={isPending} className="w-full">
                   {isPending ? "Saving…" : "Save Code"}
                 </Button>
               </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
