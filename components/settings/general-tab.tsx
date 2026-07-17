"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";

export function GeneralTab() {
  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-lg font-medium tracking-tight">Workspace Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage core settings for the Panthar Teams workspace.</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/40 pb-4 bg-muted/10 rounded-t-xl">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            General Information
          </CardTitle>
          <CardDescription className="mt-1">
            Update the workspace name and branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-2 max-w-md">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input id="workspace-name" defaultValue="Panthar Teams" />
          </div>
          <div className="grid gap-2 max-w-md">
            <Label htmlFor="workspace-domain">Workspace Domain</Label>
            <div className="flex gap-2">
              <Input id="workspace-domain" defaultValue="panthar.teams.app" disabled />
            </div>
            <p className="text-[11px] text-muted-foreground">Domain cannot be changed on the current plan.</p>
          </div>
          <Button size="sm" className="mt-2">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
