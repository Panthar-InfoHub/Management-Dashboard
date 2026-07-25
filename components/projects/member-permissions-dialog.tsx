"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, ShieldAlert, ShieldCheck, Check } from "lucide-react";
import { grantPermissionAction, revokePermissionAction } from "@/lib/actions/permission.actions";

// The subset of permissions that make sense to scope to a project
const PROJECT_SCOPED_PERMS = [
  { id: "task:create", label: "Create Tasks" },
  { id: "task:update", label: "Update Tasks" },
  { id: "task:delete", label: "Delete Tasks" },
  { id: "task:assign", label: "Assign Tasks" }
];

interface MemberPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  member: any; // ProjectMember with nested employee
  delegatedPerms: any[]; // List of permissions for this project
}

export function MemberPermissionsDialog({ 
  open, 
  onOpenChange, 
  projectId, 
  member, 
  delegatedPerms 
}: MemberPermissionsDialogProps) {
  const [isPending, startTransition] = useTransition();

  // Find permissions that belong to this member
  const memberPerms = delegatedPerms.filter(p => p.employeeId === member.employeeId);
  const activePermIds = memberPerms.map(p => p.permission);

  const togglePermission = (permission: string) => {
    startTransition(() => {
      if (activePermIds.includes(permission)) {
        revokePermissionAction({ employeeId: member.employeeId, permission, projectId })
          .then(() => toast.success(`Revoked ${permission}`))
          .catch((e: any) => toast.error(e.message));
      } else {
        grantPermissionAction({ employeeId: member.employeeId, permission, projectId })
          .then(() => toast.success(`Granted ${permission}`))
          .catch((e: any) => toast.error(e.message));
      }
    });
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Manage Permissions for {member.employee?.firstName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Grant specific permissions to {member.employee?.firstName} that only apply to this project. This is useful for assigning temporary Project Admins or Scrum Masters.
          </p>

          <div className="space-y-2 mt-4">
            {PROJECT_SCOPED_PERMS.map(perm => {
              const hasPerm = activePermIds.includes(perm.id);
              
              return (
                <div 
                  key={perm.id}
                  onClick={() => togglePermission(perm.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    hasPerm ? "border-primary/50 bg-primary/5" : "border-border/40 hover:bg-muted/50"
                  } ${isPending ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{perm.label}</span>
                    <span className="text-xs text-muted-foreground font-mono mt-0.5">{perm.id}</span>
                  </div>
                  {hasPerm ? (
                    <Badge variant="default" className="gap-1">
                      <ShieldCheck className="h-3 w-3" /> Granted
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      Grant
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
