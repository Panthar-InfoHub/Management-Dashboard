"use client";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, Mail, Shield, Building2, UserPlus, MoreVertical, Calendar, Pencil, Trash2, Eye, EyeOff, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createEmployeeAction, updateEmployeeAction, deleteEmployeeAction, generateEmployeeCodeAction, reserveEmployeeSequenceAction } from "@/lib/actions/employee.actions";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const roleColors: Record<string, string> = { 
  ADMIN: "bg-purple-500/10 text-purple-600 border-purple-500/20", 
  MANAGER: "bg-blue-500/10 text-blue-600 border-blue-500/20", 
  EMPLOYEE: "bg-gray-500/10 text-gray-600 border-gray-500/20" 
};

export function EmployeesClient({ initialEmployees, teams, availableRoles = [], isAdmin, canCreate = false, canUpdate = false, canDelete = false }: { initialEmployees: any[], teams: any[], availableRoles?: string[], isAdmin: boolean, canCreate?: boolean, canUpdate?: boolean, canDelete?: boolean }) {
  const [newEmpOpen, setNewEmpOpen] = useState(false);
  const [editEmpOpen, setEditEmpOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [newEmp, setNewEmp] = useState({ firstName: "", lastName: "", email: "", role: availableRoles[0] || "EMPLOYEE", designation: "", password: "" });
  const [setCustomPassword, setSetCustomPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingEmp, setEditingEmp] = useState<{ id: string; role: string; designation: string } | null>(null);

  const [codeEmpOpen, setCodeEmpOpen] = useState(false);
  const [codeEmpTarget, setCodeEmpTarget] = useState<any>(null);
  const [codeType, setCodeType] = useState<"PANTHAR" | "KAVACHX">("PANTHAR");
  const [joinDateStr, setJoinDateStr] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reservedSeq, setReservedSeq] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  const handleStartGenerating = () => {
    startTransition(() => {
      reserveEmployeeSequenceAction(codeType).then((seq) => {
        setReservedSeq(seq);
        setIsGenerating(true);
      }).catch((err: any) => toast.error(err.message || "Failed to reserve sequence"));
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  const handleGenerateCode = () => {
    if (!codeEmpTarget || !joinDateStr || !reservedSeq) return;
    startTransition(() => {
      generateEmployeeCodeAction(codeEmpTarget.id, codeType, joinDateStr, reservedSeq)
        .then((result) => {
          toast.success("Employee code generated!");
          router.refresh();
          // Find the updated employee and update the local target to show the code immediately
          setCodeEmpTarget({
            ...codeEmpTarget,
            pantharCode: codeType === "PANTHAR" ? result.pantharCode : codeEmpTarget.pantharCode,
            kavachXCode: codeType === "KAVACHX" ? result.kavachXCode : codeEmpTarget.kavachXCode,
          });
          setIsGenerating(false);
          setReservedSeq(null);
        })
        .catch((err: any) => toast.error(err.message || "Failed to generate code"));
    });
  };

  const handleCreateEmployee = () => {
    if (!newEmp.firstName || !newEmp.lastName || !newEmp.email) return;
    
    startTransition(() => {
      createEmployeeAction(newEmp).then(() => {
        setNewEmpOpen(false);
        setNewEmp({ firstName: "", lastName: "", email: "", role: "EMPLOYEE", designation: "", password: "" });
        setSetCustomPassword(false);
        setShowPassword(false);
        router.refresh();
      }).catch((err: any) => toast.error(err.message || "Failed to add employee"));
    });
  };

  const handleUpdateEmployee = () => {
    if (!editingEmp) return;
    startTransition(() => {
      updateEmployeeAction(editingEmp.id, { role: editingEmp.role, designation: editingEmp.designation }).then(() => {
        setEditEmpOpen(false);
        setEditingEmp(null);
        router.refresh();
      }).catch((err: any) => toast.error(err.message || "Failed to update employee"));
    });
  };

  const confirmDeleteEmployee = () => {
    if (!employeeToDelete) return;
    startTransition(() => {
      deleteEmployeeAction(employeeToDelete).then(() => {
        router.refresh();
        setDeleteDialogOpen(false);
        setEmployeeToDelete(null);
      }).catch((err: any) => toast.error(err.message || "Failed to delete employee"));
    });
  };

  const handleDeleteClick = (id: string) => {
    setEmployeeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const filteredEmployees = initialEmployees.filter(e => 
    (e.firstName + " " + e.lastName).toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto h-full overflow-y-auto selection:bg-primary/10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Organization Members</h1>
          <p className="text-sm text-muted-foreground">Manage members and their platform access.</p>
        </div>
        {canCreate && (
          <Dialog open={newEmpOpen} onOpenChange={setNewEmpOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 text-xs w-full sm:w-auto">
                <UserPlus className="h-4 w-4" /> Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Invite New Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-xs font-semibold text-muted-foreground">First Name</label>
                    <Input value={newEmp.firstName} onChange={e => setNewEmp({ ...newEmp, firstName: e.target.value })} placeholder="Jane" />
                  </div>
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-xs font-semibold text-muted-foreground">Last Name</label>
                    <Input value={newEmp.lastName} onChange={e => setNewEmp({ ...newEmp, lastName: e.target.value })} placeholder="Doe" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                    <Input value={newEmp.email} type="email" onChange={e => setNewEmp({ ...newEmp, email: e.target.value })} placeholder="jane@example.com" />
                  </div>
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground">Initial Password</label>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground">Create password</label>
                        <Switch 
                          checked={setCustomPassword} 
                          onCheckedChange={(checked) => {
                            setSetCustomPassword(checked);
                            if (!checked) setNewEmp(prev => ({ ...prev, password: "" }));
                          }} 
                          className="scale-75 data-[state=checked]:bg-primary"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <Input 
                        value={newEmp.password} 
                        type={showPassword ? "text" : "password"} 
                        disabled={!setCustomPassword}
                        onChange={e => setNewEmp({ ...newEmp, password: e.target.value })} 
                        placeholder={setCustomPassword ? "Enter password" : "Disabled (Invite via email)"} 
                        className="pr-10"
                      />
                      {setCustomPassword && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-muted-foreground">Designation / Title</label>
                  <Input value={newEmp.designation} onChange={e => setNewEmp({ ...newEmp, designation: e.target.value })} placeholder="E.g. Senior Frontend Engineer" />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-muted-foreground">System Role</label>
                  <Select value={newEmp.role} onValueChange={(val: string) => setNewEmp({ ...newEmp, role: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.filter(roleName => isAdmin || roleName !== "ADMIN").map(roleName => (
                        <SelectItem key={roleName} value={roleName}>{roleName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-[11px] text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40 mt-4">
                  If you leave the password blank, an email invitation will be sent instead. If you set a password, the account is created instantly.
                </div>
                <Button onClick={handleCreateEmployee} disabled={isPending || !newEmp.firstName || !newEmp.email} className="w-full">
                  {isPending ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Dialog open={editEmpOpen} onOpenChange={setEditEmpOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          {editingEmp && (
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground">Designation / Title</label>
                <Input value={editingEmp.designation} onChange={e => setEditingEmp({ ...editingEmp, designation: e.target.value })} placeholder="E.g. Senior Frontend Engineer" />
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-semibold text-muted-foreground">System Role</label>
                <Select value={editingEmp.role} onValueChange={(val: string) => setEditingEmp({ ...editingEmp, role: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.filter(roleName => isAdmin || roleName !== "ADMIN").map(roleName => (
                      <SelectItem key={roleName} value={roleName}>{roleName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-[11px] text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40 mt-4">
                Updating their role will immediately sync with their Clerk permissions.
              </div>
              <Button onClick={handleUpdateEmployee} disabled={isPending} className="w-full">
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={codeEmpOpen} onOpenChange={(val) => { setCodeEmpOpen(val); if(!val) { setIsGenerating(false); setReservedSeq(null); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Codes</DialogTitle>
          </DialogHeader>
          {codeEmpTarget && (
            <div className="space-y-6 pt-4">
              <div className="flex bg-muted/30 p-1 rounded-md">
                <Button 
                  variant={codeType === "PANTHAR" ? "default" : "ghost"} 
                  className="flex-1 h-8 text-xs" 
                  onClick={() => { setCodeType("PANTHAR"); setIsGenerating(false); setReservedSeq(null); }}
                >
                  Panthar
                </Button>
                <Button 
                  variant={codeType === "KAVACHX" ? "default" : "ghost"} 
                  className="flex-1 h-8 text-xs" 
                  onClick={() => { setCodeType("KAVACHX"); setIsGenerating(false); setReservedSeq(null); }}
                >
                  KavachX
                </Button>
              </div>

              <div className="space-y-4">
                {codeType === "PANTHAR" && (
                  codeEmpTarget.pantharCode && codeEmpTarget.pantharCode !== "Generated..." ? (
                    <div className="bg-primary/5 border border-primary/20 rounded-md p-6 text-center relative group">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Panthar Code</p>
                      <div className="flex items-center justify-center gap-3">
                        <p className="text-3xl font-bold tracking-tight text-primary">{codeEmpTarget.pantharCode}</p>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCopyCode(codeEmpTarget.pantharCode)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-muted/30 border border-border/40 rounded-md p-4 text-center">
                        <p className="text-sm font-medium text-foreground">No Panthar Code Found</p>
                        <p className="text-xs text-muted-foreground mt-1">Generate a new unique identifier.</p>
                      </div>
                      
                      {!isGenerating ? (
                        <Button onClick={handleStartGenerating} disabled={isPending} className="w-full">
                          {isPending ? "Reserving Sequence..." : "Generate Panthar Code"}
                        </Button>
                      ) : (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-200">
                          <div className="space-y-1.5 flex flex-col">
                            <label className="text-xs font-semibold text-muted-foreground">Confirm Date of Joining</label>
                            <Input 
                              type="date" 
                              value={joinDateStr} 
                              onChange={(e) => setJoinDateStr(e.target.value)} 
                              className="w-full"
                            />
                            <p className="text-[10px] text-muted-foreground/80 mt-1 leading-tight">
                              This code cannot be modified after generation. Ensure the Date of Joining is correct.
                            </p>
                          </div>
                          <div className="bg-primary/5 text-primary text-xs text-center p-3 rounded-md font-medium tracking-wide border border-primary/20">
                            Reserved Sequence: <span className="font-bold text-lg">{reservedSeq}</span>
                          </div>
                          <Button onClick={handleGenerateCode} disabled={isPending || !joinDateStr || !reservedSeq} className="w-full">
                            {isPending ? "Generating..." : "Confirm & Save"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                )}

                {codeType === "KAVACHX" && (
                  codeEmpTarget.kavachXCode && codeEmpTarget.kavachXCode !== "Generated..." ? (
                    <div className="bg-primary/5 border border-primary/20 rounded-md p-6 text-center relative group">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">KavachX Code</p>
                      <div className="flex items-center justify-center gap-3">
                        <p className="text-3xl font-bold tracking-tight text-primary">{codeEmpTarget.kavachXCode}</p>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleCopyCode(codeEmpTarget.kavachXCode)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-muted/30 border border-border/40 rounded-md p-4 text-center">
                        <p className="text-sm font-medium text-foreground">No KavachX Code Found</p>
                        <p className="text-xs text-muted-foreground mt-1">Generate a new unique identifier.</p>
                      </div>
                      
                      {!isGenerating ? (
                        <Button onClick={handleStartGenerating} disabled={isPending} className="w-full">
                          {isPending ? "Reserving Sequence..." : "Generate KavachX Code"}
                        </Button>
                      ) : (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-200">
                          <div className="space-y-1.5 flex flex-col">
                            <label className="text-xs font-semibold text-muted-foreground">Confirm Date of Joining</label>
                            <Input 
                              type="date" 
                              value={joinDateStr} 
                              onChange={(e) => setJoinDateStr(e.target.value)} 
                              className="w-full"
                            />
                            <p className="text-[10px] text-muted-foreground/80 mt-1 leading-tight">
                              This code cannot be modified after generation. Ensure the Date of Joining is correct.
                            </p>
                          </div>
                          <div className="bg-primary/5 text-primary text-xs text-center p-3 rounded-md font-medium tracking-wide border border-primary/20">
                            Reserved Sequence: <span className="font-bold text-lg">{reservedSeq}</span>
                          </div>
                          <Button onClick={handleGenerateCode} disabled={isPending || !joinDateStr || !reservedSeq} className="w-full">
                            {isPending ? "Generating..." : "Confirm & Save"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by name or email..." 
            className="pl-9 bg-background border-border/40" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="border border-border/40 rounded-lg overflow-x-auto bg-background">
        <Table className="min-w-[1000px]">
          <TableHeader className="bg-muted/20">
            <TableRow>
              <TableHead className="min-w-[250px] font-medium text-[11px] uppercase tracking-wider">Name & Title</TableHead>
              <TableHead className="min-w-[180px] font-medium text-[11px] uppercase tracking-wider">Contact Info</TableHead>
              {isAdmin && <TableHead className="min-w-[180px] font-medium text-[11px] uppercase tracking-wider">Status & System Role</TableHead>}
              <TableHead className="min-w-[120px] font-medium text-[11px] uppercase tracking-wider">Joined</TableHead>
              {(canUpdate || canDelete) && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center">
                  <div className="p-8 text-center text-sm text-muted-foreground">No members found matching your search.</div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map(emp => (
                <TableRow key={emp.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className="h-10 w-10 border border-border/40">
                          <AvatarImage src={emp.avatarUrl} />
                          <AvatarFallback className="bg-primary/5 text-sm font-medium text-foreground">{emp.firstName.charAt(0)}{emp.lastName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {emp.status === "ACTIVE" && (
                          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{emp.designation || "No Designation"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                      {emp.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{emp.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-[9px] px-2 py-0.5 shadow-none rounded-full border-border/40", roleColors[emp.role] || "bg-gray-500/10 text-gray-600 border-gray-500/20")}>
                          {emp.role}
                        </Badge>
                        {emp.clerkId.startsWith("pending_") && (
                          <Badge variant="outline" className="text-[9px] px-2 py-0.5 shadow-none rounded-full bg-amber-500/10 text-amber-600 border-amber-500/20">
                            INVITED
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(emp.joinDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </TableCell>
                  {(canUpdate || canDelete) && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px]">
                          {canUpdate && (
                            <DropdownMenuItem className="text-xs" onClick={() => {
                              setEditingEmp({ id: emp.id, role: emp.role, designation: emp.designation || "" });
                              setEditEmpOpen(true);
                            }}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Edit Role & Title
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <DropdownMenuItem className="text-xs" onClick={() => {
                              setCodeEmpTarget(emp);
                              setCodeType("PANTHAR");
                              setCodeEmpOpen(true);
                            }}>
                              <Shield className="h-3.5 w-3.5 mr-2" />
                              Employee Codes
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer text-xs" onClick={() => handleDeleteClick(emp.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Remove Member
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the member from the organization and instantly revoke their platform access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEmployee} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
