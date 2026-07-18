"use client";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Mail, Building2, Shield, Pencil, UserMinus, ArrowUpRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  updateEmployeeAction, 
  generateEmployeeCodeAction, 
  reserveEmployeeSequenceAction,
  transitionRoleAction,
  offboardEmployeeAction
} from "@/lib/actions/employee.actions";

const formatDate = (dateString: string | Date) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const day = d.getDate().toString().padStart(2, '0');
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

export function EmployeeProfileClient({ employee, availableRoles, isAdmin, isManager }: { employee: any, availableRoles: string[], isAdmin: boolean, isManager: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [editOpen, setEditOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState({ role: employee.role, designation: employee.designation || "", joinDate: employee.joinDate ? new Date(employee.joinDate).toISOString().split("T")[0] : "" });

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteData, setPromoteData] = useState({ newRole: availableRoles[0] || "EMPLOYEE", newDesignation: "", startDate: new Date().toISOString().split("T")[0], reason: "Promotion/Transition" });

  const [offboardOpen, setOffboardOpen] = useState(false);
  const [offboardData, setOffboardData] = useState({ endDate: new Date().toISOString().split("T")[0], reason: "Offboarding" });

  const [codeType, setCodeType] = useState<"PANTHAR" | "KAVACHX" | null>(null);
  const [reservedSeq, setReservedSeq] = useState<number | null>(null);

  const handleUpdate = () => {
    startTransition(() => {
      updateEmployeeAction(employee.id, editingEmp).then(() => {
        setEditOpen(false);
        router.refresh();
        toast.success("Profile updated");
      }).catch((e: any) => toast.error(e.message));
    });
  };

  const handlePromote = () => {
    startTransition(() => {
      transitionRoleAction(employee.id, promoteData).then(() => {
        setPromoteOpen(false);
        router.refresh();
        toast.success("Role transitioned successfully");
      }).catch((e: any) => toast.error(e.message));
    });
  };

  const handleOffboard = () => {
    startTransition(() => {
      offboardEmployeeAction(employee.id, offboardData).then(() => {
        setOffboardOpen(false);
        router.refresh();
        toast.success("Employee offboarded successfully");
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
        router.refresh();
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
            </div>
          </div>
          
          <div className="flex flex-col gap-2 min-w-[140px]">
            <Badge variant="outline" className="w-fit self-start sm:self-end text-xs px-2.5 py-0.5">
              {employee.role}
            </Badge>
            <Badge variant="secondary" className="w-fit self-start sm:self-end text-xs px-2.5 py-0.5 mt-1">
              {employee.status}
            </Badge>
          </div>
        </div>
        
        {/* Actions Bar - Flat style */}
        <div className="px-8 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2 bg-background">
            <Pencil className="h-4 w-4" /> Edit Profile
          </Button>
          {employee.status === "ACTIVE" && (
            <>
              <Button variant="outline" onClick={() => setPromoteOpen(true)} className="gap-2 border-primary/30 text-primary hover:bg-primary/5 bg-background">
                <ArrowUpRight className="h-4 w-4" /> Promote / Transition
              </Button>
              <Button variant="outline" onClick={() => setOffboardOpen(true)} className="gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/5 bg-background">
                <UserMinus className="h-4 w-4" /> Offboard
              </Button>
            </>
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
              {!employee.pantharCode && (
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
              {!employee.kavachXCode && (
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
                      <span className="font-semibold text-sm">{record.designation || "Employee"}</span>
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
              <label className="text-xs font-semibold text-muted-foreground">Role (Note: Use Promote to track history)</label>
              <Select value={editingEmp.role} onValueChange={(v) => setEditingEmp({...editingEmp, role: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {availableRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleUpdate} disabled={isPending}>{isPending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promote Modal */}
      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Promote / Transition Role</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">New Role</label>
              <Select value={promoteData.newRole} onValueChange={(v) => setPromoteData({...promoteData, newRole: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {availableRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">New Designation</label>
              <Input value={promoteData.newDesignation} onChange={e => setPromoteData({...promoteData, newDesignation: e.target.value})} placeholder="e.g. Senior Employee" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Effective Start Date</label>
              <Input type="date" value={promoteData.startDate} onChange={e => setPromoteData({...promoteData, startDate: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Reason / Notes</label>
              <Input value={promoteData.reason} onChange={e => setPromoteData({...promoteData, reason: e.target.value})} />
            </div>
            <Button className="w-full" onClick={handlePromote} disabled={isPending}>{isPending ? "Transitioning..." : "Confirm Transition"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offboard Dialog */}
      <AlertDialog open={offboardOpen} onOpenChange={setOffboardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offboard Employee</AlertDialogTitle>
            <AlertDialogDescription>
              This will suspend their login access, remove them from active teams, and mark them INACTIVE. Their historical data and tasks will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Effective End Date</label>
              <Input type="date" value={offboardData.endDate} onChange={e => setOffboardData({...offboardData, endDate: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Reason</label>
              <Input value={offboardData.reason} onChange={e => setOffboardData({...offboardData, reason: e.target.value})} placeholder="e.g. Resigned, End of Internship" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleOffboard} disabled={isPending} className="bg-amber-600 text-white hover:bg-amber-700">
              {isPending ? "Offboarding..." : "Confirm Offboard"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
