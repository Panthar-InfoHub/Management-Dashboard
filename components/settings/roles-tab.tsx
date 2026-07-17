"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getSystemRolesAction, updateSystemRolePermissionsAction, createSystemRoleAction, deleteSystemRoleAction } from "@/lib/actions/role.actions";
import { Shield, Folder, CheckSquare, Users, Building, FileText, Calendar, Clock, Lock, ShieldAlert, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PERMISSION_GROUPS = [
  {
    id: "task",
    label: "Tasks",
    icon: CheckSquare,
    desc: "Control task creation, modification, and deletion.",
    permissions: [
      { id: "task:create", label: "Create Tasks" },
      { id: "task:update", label: "Update Tasks" },
      { id: "task:delete", label: "Delete Tasks" }
    ]
  },
  {
    id: "project",
    label: "Projects",
    icon: Folder,
    desc: "Manage project creation and configuration.",
    permissions: [
      { id: "project:create", label: "Create Projects" },
      { id: "project:update", label: "Edit Projects" },
      { id: "project:delete", label: "Delete Projects" }
    ]
  },
  {
    id: "team",
    label: "Teams",
    icon: Building,
    desc: "Configure team structures.",
    permissions: [
      { id: "team:create", label: "Create Teams" },
      { id: "team:update", label: "Edit Teams" },
      { id: "team:delete", label: "Delete Teams" }
    ]
  },
  {
    id: "employee",
    label: "Personnel & Directory",
    icon: Users,
    desc: "Manage employee records.",
    permissions: [
      { id: "employee:create", label: "Create Employees" },
      { id: "employee:update", label: "Edit Employee Profiles" },
      { id: "employee:delete", label: "Delete Employees" }
    ]
  }
];

export function RolesTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchRoles = () => {
    getSystemRolesAction().then(res => {
      setRoles(res);
      if (!selectedRole && res.length > 0) setSelectedRole(res[0].name);
    }).catch((err: any) => {
      console.error(err);
      toast.error(err.message || "Failed to load roles");
    });
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleTogglePermission = (roleName: string, permission: string, checked: boolean) => {
    const role = roles.find(r => r.name === roleName);
    if (!role) return;

    let newPerms = [...role.permissions];
    if (checked && !newPerms.includes(permission)) newPerms.push(permission);
    if (!checked) newPerms = newPerms.filter(p => p !== permission);

    setRoles(roles.map(r => r.name === roleName ? { ...r, permissions: newPerms } : r));

    startTransition(() => {
      updateSystemRolePermissionsAction(roleName, newPerms)
        .then(() => {
          toast.success("Permissions updated");
          fetchRoles();
        })
        .catch((err: any) => {
          toast.error(err.message || "Failed to update permissions");
          fetchRoles();
        });
    });
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    startTransition(() => {
      createSystemRoleAction(newRoleName, []).then(() => {
        setNewRoleName("");
        setNewRoleOpen(false);
        toast.success("Role created");
        fetchRoles();
      }).catch((err: any) => {
        toast.error(err.message || "Failed to create role");
      });
    });
  };

  const handleDeleteRole = (roleName: string) => {
    if (!confirm(`Are you sure you want to delete the ${roleName} role? This cannot be undone.`)) return;
    startTransition(() => {
      deleteSystemRoleAction(roleName).then(() => {
        if (selectedRole === roleName) setSelectedRole(roles[0]?.name || null);
        toast.success("Role deleted");
        fetchRoles();
      }).catch((err: any) => {
        toast.error(err.message || "Failed to delete role");
      });
    });
  };

  const activeRoleRecord = roles.find(r => r.name === selectedRole);

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage access control and operational privileges across the workspace.</p>
        </div>
        <Dialog open={newRoleOpen} onOpenChange={setNewRoleOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shadow-none gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" /> New Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Create Custom Role</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input 
                  id="name" 
                  value={newRoleName} 
                  onChange={e => setNewRoleName(e.target.value.toUpperCase().replace(/\s+/g, '_'))} 
                  placeholder="e.g. GUEST, CONTRACTOR" 
                  className="uppercase"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateRole} disabled={isPending || !newRoleName} className="w-full">
                Create Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-6 relative">
        {/* Roles Sidebar */}
        <div className="w-48 shrink-0 flex flex-col gap-1">
          {roles.map(role => (
            <button
              key={role.name}
              onClick={() => setSelectedRole(role.name)}
              className={cn(
                "flex flex-col items-start px-3 py-2.5 rounded-md text-sm font-medium transition-all border border-transparent text-left",
                selectedRole === role.name 
                  ? "bg-primary/5 text-primary border-primary/10 shadow-sm" 
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2">
                {role.name === "ADMIN" ? <Shield className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5 opacity-50" />}
                {role.name}
              </span>
              {role.isSystem && <span className="text-[10px] font-normal opacity-60 mt-0.5">System Default</span>}
            </button>
          ))}
        </div>

        {/* Permissions Content */}
        <div className="flex-1 min-w-0">
          {activeRoleRecord && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4 bg-muted/10 rounded-t-xl">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {activeRoleRecord.name} Permissions
                    {activeRoleRecord.isSystem && (
                      <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">System Role</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Toggle capabilities for users assigned to this role.
                  </CardDescription>
                </div>
                {!activeRoleRecord.isSystem && (
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(activeRoleRecord.name)} disabled={isPending} className="text-red-600 hover:bg-red-50 hover:text-red-600 h-8 gap-1.5 px-2">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                )}
              </CardHeader>
              
              <CardContent className="p-0">
                {activeRoleRecord.name === "ADMIN" ? (
                  <div className="p-12 text-center flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <ShieldAlert className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium">Full Access Granted</h3>
                    <p className="text-sm text-muted-foreground max-w-[300px] mt-2">
                      The ADMIN role is a core system role with unrestricted access. Its permissions cannot be modified.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.id} className="p-5 sm:p-6 hover:bg-muted/5 transition-colors">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="p-2 rounded-md bg-accent/50 border border-border/50 shrink-0">
                            <group.icon className="h-4 w-4 text-foreground/70" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold">{group.label}</h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{group.desc}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 pl-14">
                          {group.permissions.map(permission => {
                            const isChecked = activeRoleRecord.permissions.includes(permission.id);
                            return (
                              <div key={permission.id} className="flex items-center space-x-3 group cursor-pointer" onClick={() => !isPending && handleTogglePermission(activeRoleRecord.name, permission.id, !isChecked)}>
                                <Switch 
                                  checked={isChecked}
                                  disabled={isPending}
                                  className="scale-75 data-[state=checked]:bg-primary"
                                />
                                <Label className="text-xs font-medium cursor-pointer group-hover:text-foreground text-muted-foreground transition-colors">
                                  {permission.label}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
