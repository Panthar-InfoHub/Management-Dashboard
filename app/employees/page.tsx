"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { employees as mockEmployees } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Search, Filter, Mail, Flame, TrendingUp, Wifi, WifiOff, Clock, Plus } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  online: { label: "Online", color: "bg-green-500", icon: Wifi },
  away: { label: "Away", color: "bg-amber-500", icon: Clock },
  offline: { label: "Offline", color: "bg-gray-500", icon: WifiOff },
};

export default function EmployeesPage() {
  const [employeeList, setEmployeeList] = useState(mockEmployees);
  const [newEmpOpen, setNewEmpOpen] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: "", role: "", email: "", team: "Engineering" });

  const handleCreateEmployee = () => {
    if (!newEmp.name || !newEmp.role || !newEmp.email) return;
    const emp = {
      id: `EMP-${Math.floor(Math.random() * 10000)}`,
      name: newEmp.name,
      avatar: newEmp.name.substring(0, 2).toUpperCase(),
      role: newEmp.role,
      email: newEmp.email,
      status: "online" as const,
      streak: 1,
      productivity: 100,
      skills: ["New Hire"],
      team: newEmp.team,
    };
    setEmployeeList([emp, ...employeeList]);
    setNewEmp({ name: "", role: "", email: "", team: "Engineering" });
    setNewEmpOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">View and manage all team members across the organization.</p>
        </div>
        <Dialog open={newEmpOpen} onOpenChange={setNewEmpOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add Employee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Full Name</label>
                <Input value={newEmp.name} onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} placeholder="E.g. Jane Doe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Role</label>
                  <Input value={newEmp.role} onChange={e => setNewEmp({ ...newEmp, role: e.target.value })} placeholder="E.g. Frontend Engineer" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Email</label>
                  <Input value={newEmp.email} onChange={e => setNewEmp({ ...newEmp, email: e.target.value })} placeholder="jane@example.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Team</label>
                <Select value={newEmp.team} onValueChange={v => setNewEmp({ ...newEmp, team: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateEmployee} className="w-full mt-4">Create Employee</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search employees…" className="pl-9 h-9 text-sm" />
        </div>
        <Button variant="secondary" size="sm" className="gap-2 text-xs"><Filter className="h-3.5 w-3.5" /> Filter</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {employeeList.map(emp => {
          const status = statusConfig[emp.status];
          return (
            <Card key={emp.id} className="group border-border/50 hover:border-border transition-all hover:shadow-sm cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-sm font-medium">{emp.avatar}</AvatarFallback>
                    </Avatar>
                    <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card", status.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{emp.role}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{emp.team}</Badge>
                  <Badge variant="secondary" className={cn("text-[10px]", status.color === "bg-green-500" ? "bg-green-500/10 text-green-500" : status.color === "bg-amber-500" ? "bg-amber-500/10 text-amber-500" : "bg-gray-500/10 text-gray-500")}>
                    {status.label}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-accent/50 p-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      <span className="text-xs font-semibold">{emp.streak}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">Streak</p>
                  </div>
                  <div className="rounded-md bg-accent/50 p-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3 text-blue-500" />
                      <span className="text-xs font-semibold">{emp.productivity}%</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">Productivity</p>
                  </div>
                  <div className="rounded-md bg-accent/50 p-1.5">
                    <div className="flex items-center justify-center">
                      <span className="text-xs font-semibold">{emp.skills.length}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">Skills</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {emp.skills.slice(0, 3).map(s => (
                    <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-[9px] text-muted-foreground">{s}</span>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{emp.email}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
