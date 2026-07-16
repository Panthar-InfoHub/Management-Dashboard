"use client";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Mail, Shield, Building2, UserPlus, MoreVertical, Calendar } from "lucide-react";
import { createEmployeeAction } from "@/lib/actions/employee.actions";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";

const roleColors: Record<string, string> = { 
  ADMIN: "bg-purple-500/10 text-purple-600 border-purple-500/20", 
  MANAGER: "bg-blue-500/10 text-blue-600 border-blue-500/20", 
  EMPLOYEE: "bg-gray-500/10 text-gray-600 border-gray-500/20" 
};

export function EmployeesClient({ initialEmployees, teams, isAdmin }: { initialEmployees: any[], teams: any[], isAdmin: boolean }) {
  const [employeeList, setEmployeeList] = useState(initialEmployees);
  const [newEmpOpen, setNewEmpOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [newEmp, setNewEmp] = useState({ firstName: "", lastName: "", email: "", role: "EMPLOYEE" as Role, designation: "" });

  const handleCreateEmployee = () => {
    if (!newEmp.firstName || !newEmp.lastName || !newEmp.email) return;
    
    startTransition(() => {
      createEmployeeAction(newEmp).then(() => {
        setNewEmpOpen(false);
        setNewEmp({ firstName: "", lastName: "", email: "", role: "EMPLOYEE", designation: "" });
        router.refresh();
      }).catch(err => console.error(err));
    });
  };

  const filteredEmployees = employeeList.filter(e => 
    (e.firstName + " " + e.lastName).toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-7xl mx-auto h-full selection:bg-primary/10">
      <div className="flex items-center justify-between pb-6 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage personnel, roles, and access across your organization.</p>
        </div>
        {isAdmin && (
          <Dialog open={newEmpOpen} onOpenChange={setNewEmpOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 shadow-none"><UserPlus className="h-4 w-4" /> Add Member</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite New Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-xs font-semibold text-muted-foreground">First Name</label>
                    <Input value={newEmp.firstName} onChange={e => setNewEmp({ ...newEmp, firstName: e.target.value })} placeholder="Jane" />
                  </div>
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-xs font-semibold text-muted-foreground">Last Name</label>
                    <Input value={newEmp.lastName} onChange={e => setNewEmp({ ...newEmp, lastName: e.target.value })} placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                  <Input value={newEmp.email} type="email" onChange={e => setNewEmp({ ...newEmp, email: e.target.value })} placeholder="jane@example.com" />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-muted-foreground">Designation / Title</label>
                  <Input value={newEmp.designation} onChange={e => setNewEmp({ ...newEmp, designation: e.target.value })} placeholder="E.g. Senior Frontend Engineer" />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-muted-foreground">System Role</label>
                  <Select value={newEmp.role} onValueChange={(val: Role) => setNewEmp({ ...newEmp, role: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-[11px] text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40 mt-4">
                  When they sign up with this email address, their account will be automatically linked to this profile.
                </div>
                <Button onClick={handleCreateEmployee} disabled={isPending || !newEmp.firstName || !newEmp.email} className="w-full">
                  {isPending ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

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

      <div className="border border-border/40 rounded-lg overflow-hidden bg-background">
        <div className="divide-y divide-border/40 bg-muted/5">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_40px] gap-4 px-5 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/20">
            <span>Name & Title</span><span>Contact Info</span><span>Status & System Role</span><span>Joined</span><span className="text-right"></span>
          </div>
          
          {/* Table Rows */}
          {filteredEmployees.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No personnel found matching your search.</div>
          ) : (
            filteredEmployees.map(emp => (
              <div key={emp.id} className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_40px] gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors">
                
                {/* Column 1: Name & Title */}
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

                {/* Column 2: Contact Info */}
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

                {/* Column 3: Status & Role */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[9px] px-2 py-0.5 shadow-none rounded-full border-border/40", roleColors[emp.role])}>
                    {emp.role}
                  </Badge>
                  {emp.clerkId.startsWith("pending_") && (
                    <Badge variant="outline" className="text-[9px] px-2 py-0.5 shadow-none rounded-full bg-amber-500/10 text-amber-600 border-amber-500/20">
                      INVITED
                    </Badge>
                  )}
                </div>

                {/* Column 4: Joined Date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(emp.joinDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>

                {/* Actions */}
                <div className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
