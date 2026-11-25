"use client";

import { PromoteDialog } from "@/components/employees/promote-dialog";
import { OffboardDialog } from "@/components/employees/offboard-dialog";
import type { OffboardingChecklist } from "@/lib/employees/offboarding";

const LEDGER_LABELS: Record<string, string> = {
  JOINED: "Joined", PROMOTION: "Promotion", TRANSFER: "Transfer", TITLE_CHANGE: "Title change", REHIRED: "Rehired", EXITED: "Left",
};

import { ACCESS_ROLES, EMPLOYMENT_TYPE_LABELS, ROLE_LABELS, type AccessRole, type EmploymentTypeValue } from "@/lib/access";
import { EmployeeAccessPanel, type PresetOption } from "@/components/employees/employee-access-panel";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Mail, Building2, Shield, Pencil, Copy } from "lucide-react";
import { toast } from "sonner";
import { 
  updateEmployeeAction, 
  generateEmployeeCodeAction, 
  reserveEmployeeSequenceAction,
} from "@/lib/actions/employee.actions";

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
}: {
  employee: any;
  canEdit?: boolean;
  canAssignRoles?: boolean;
  canOffboard?: boolean;
  access?: { presets: PresetOption[]; assignedPresetIds: string[]; personalPermissions: string[] } | null;
  teams?: { id: string; name: string }[];
  checklist?: OffboardingChecklist | null;
}) {
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState({
    role: employee.role as AccessRole,
    employmentType: (employee.employmentType ?? "FULL_TIME") as EmploymentTypeValue,
    designation: employee.designation || "",
    joinDate: employee.joinDate ? new Date(employee.joinDate).toISOString().split("T")[0] : "",
  });



  const [codeType, setCodeType] = useState<"PANTHAR" | "KAVACHX" | null>(null);
  const [reservedSeq, setReservedSeq] = useState<number | null>(null);

  const handleUpdate = () => {
    startTransition(() => {
      const { role, ...rest } = editingEmp;
      updateEmployeeAction(employee.id, canAssignRoles ? editingEmp : rest).then(() => {
        setEditOpen(false);
        toast.success("Profile updated");
      }).catch((e: any) => toast.error(e.message));
    });
  };

  const handleStartGenerating = (type: "PANTHAR" | "KAVACHX") => {
    setCodeType(type);
    setReservedSeq(null);
    startTransition(() => {
      reserveEmployeeSequenceAction(type).then((seq) => {
        setReservedSeq(seq);
      }).catch((e: any) => toast.error(e.message));
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
        toast.success("Code generated!");
      }).catch((e: any) => toast.error(e.message));
    });
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300 pb-20">
      {/* Header Profile Section - Flatter */}
      <div className="relative">
        <div className="h-40 bg-gradient-to-r from-muted/50 to-muted/20 rounded-xl border border-border/40 relative">
          <div className="absolute -bottom-12 left-8">
            <Avatar className="h-28 w-28 border-4 border-background bg-background shadow-sm">
              <AvatarImage src={employee.avatarUrl} />
              <AvatarFallback className="text-3xl">{employee.firstName[0]}{employee.lastName[0]}</AvatarFallback>
            </Avatar>
            {employee.status === "ACTIVE" && (
              <span className="absolute bottom-2 right-2 block h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-background" />
            )}
            {employee.status === "INACTIVE" && (
              <span className="absolute bottom-2 right-2 block h-5 w-5 rounded-full bg-red-500 ring-4 ring-background" />
            )}
          </div>
        </div>
        
        <div className="pt-16 pb-6 px-8 flex flex-col sm:flex-row justify-between gap-6 items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{employee.firstName} {employee.lastName}</h2>
            <p className="text-muted-foreground font-medium">{employee.designation || "No Designation"}</p>
            
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {employee.email}</div>
              {employee.phone && <div className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {employee.phone}</div>}
              <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Joined {formatDate(employee.joinDate)}</div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs">Teams:</span>
                {(employee.teamMemberships ?? []).length === 0
                  ? <span className="text-xs italic">none yet</span>
                  : (employee.teamMemberships as { team: { id: string; name: string } }[]).map((m) => (
                      <span key={m.team.id} className="rounded border border-border/60 px-1.5 py-0.5 text-[11px]">{m.team.name}</span>
                    ))}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 min-w-[140px]">
            <Badge variant="outline" className="w-fit self-start sm:self-end text-xs px-2.5 py-0.5">
              {ROLE_LABELS[employee.role as AccessRole] ?? employee.role}
            </Badge>
            <Badge variant="outline" className="w-fit self-start sm:self-end text-xs px-2.5 py-0.5">
              {EMPLOYMENT_TYPE_LABELS[(employee.employmentType ?? "FULL_TIME") as EmploymentTypeValue]}
            </Badge>
            <Badge variant="secondary" className="w-fit self-start sm:self-end text-xs px-2.5 py-0.5 mt-1">
              {employee.status}
            </Badge>
          </div>
        </div>
        
        {/* Actions Bar - Flat style */}
        <div className="px-8 flex flex-wrap gap-3">
          {canEdit && (
            <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2 bg-background">
              <Pencil className="h-4 w-4" /> Edit Profile
            </Button>
          )}
          {employee.status === "ACTIVE" && canEdit && (
            <PromoteDialog
              employee={{
                ...employee,
                teamIds: (employee.teamMemberships ?? []).map((m: { team: { id: string } }) => m.team.id),
                ledTeamIds: (employee.teamMemberships ?? []).filter((m: { team: { leadId: string } }) => m.team.leadId === employee.id).map((m: { team: { id: string } }) => m.team.id),
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2">
        {/* Employee Codes - Flat design */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <Shield className="h-5 w-5 text-primary" /> 
            <h3 className="text-lg font-semibold tracking-tight">System Identifiers</h3>
          </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Panthar Code</p>
                {employee.pantharCode ? (
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-medium">{employee.pantharCode}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copy(employee.pantharCode)}><Copy className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not generated</p>
                )}
              </div>
              {!employee.pantharCode && canEdit && (
                <Button variant="secondary" size="sm" onClick={() => handleStartGenerating("PANTHAR")} disabled={isPending}>
                  Generate
                </Button>
              )}
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">KavachX Code</p>
                {employee.kavachXCode ? (
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-medium">{employee.kavachXCode}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copy(employee.kavachXCode)}><Copy className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Not generated</p>
                )}
              </div>
              {!employee.kavachXCode && canEdit && (
                <Button variant="secondary" size="sm" onClick={() => handleStartGenerating("KAVACHX")} disabled={isPending}>
                  Generate
                </Button>
              )}
            </div>
          </div>

        {/* Employment Ledger - Flat design */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <Calendar className="h-5 w-5 text-primary" /> 
            <h3 className="text-lg font-semibold tracking-tight">Employment Ledger</h3>
          </div>
          
          <div className="relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-border/60 space-y-6">
              {employee.employmentRecords?.map((record: any, index: number) => (
                <div key={record.id} className="relative group">
                  <div className="absolute -left-6 top-1.5 flex items-center justify-center w-3 h-3 rounded-full bg-primary/20 border border-primary shadow z-10" />
                  <div className="bg-muted/10 p-4 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {record.designation || "Employee"}
                        {record.type && <span className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{LEDGER_LABELS[record.type] ?? record.type}</span>}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {formatDate(record.startDate)} - {record.endDate ? formatDate(record.endDate) : 'Present'}
                      </span>
                    </div>
                    {record.reason && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1 italic">Reason: {record.reason}</p>
                    )}
                  </div>
                </div>
              ))}
              {employee.employmentRecords?.length === 0 && (
                <div className="text-sm text-muted-foreground p-4">No records found.</div>
              )}
            </div>
        </div>
      </div>

      {access && (
        <div className="px-2">
          <EmployeeAccessPanel
            employeeId={employee.id}
            presets={access.presets}
            assignedPresetIds={access.assignedPresetIds}
            personalPermissions={access.personalPermissions}
          />
        </div>
      )}

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
              <Input type="date" value={editingEmp.joinDate} onChange={e => setEditingEmp({...editingEmp, joinDate: e.target.value})} />
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
            <Button className="w-full" onClick={handleUpdate} disabled={isPending}>{isPending ? "Saving..." : "Save Changes"}</Button>
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
                 <div className="bg-primary/5 text-primary text-sm p-4 rounded-md font-medium tracking-wide border border-primary/20 flex flex-col gap-1">
                   <span className="text-xs text-muted-foreground uppercase">Generated Preview</span>
                   <span className="font-bold text-xl">
                     {codeType === "PANTHAR" ? "PTHUB" : "KAVACHX"}-
                     {String(new Date(employee.joinDate).getDate()).padStart(2, "0")}
                     {String(new Date(employee.joinDate).getMonth() + 1).padStart(2, "0")}
                     {String(new Date(employee.joinDate).getFullYear()).slice(-2)}
                     {reservedSeq}
                   </span>
                 </div>
                 <Button onClick={handleGenerateCode} disabled={isPending} className="w-full">
                   {isPending ? "Saving..." : "Confirm & Save"}
                 </Button>
               </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
