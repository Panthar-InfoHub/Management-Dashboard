"use client";

import { KeyRound } from "lucide-react";
import { RolesTab } from "@/components/settings/roles-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SettingsClient() {
  return (
    <Tabs defaultValue="roles" className="flex flex-col gap-6">
      <div className="w-full overflow-x-auto pb-1">
        <TabsList className="w-fit justify-start h-9">
          <TabsTrigger value="roles" className="gap-2 text-xs h-7">
            <KeyRound className="h-3.5 w-3.5" /> Roles & Permissions
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 min-w-0 pb-10">
        <TabsContent value="roles" className="m-0 border-0 p-0 focus-visible:outline-none">
          <RolesTab />
        </TabsContent>
      </div>
    </Tabs>
  );
}
