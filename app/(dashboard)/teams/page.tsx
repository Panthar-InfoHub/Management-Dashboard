import { Suspense } from "react";
import { getTeams } from "@/lib/queries/team.queries";
import { TeamsClient } from "@/components/teams/teams-client";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { TeamsBodySkeleton } from "./skeleton";

export default function TeamsPage() {
  return (
    <div className="space-y-6 p-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between pb-6 border-b border-border/40 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage functional groups and track project assignments.</p>
        </div>
      </div>
      <Suspense fallback={<TeamsBodySkeleton />}>
        <TeamsDataAsync />
      </Suspense>
    </div>
  );
}

async function TeamsDataAsync() {
  const [, canCreate, teams] = await Promise.all([
    getCurrentEmployee(),
    checkPermission("team:create"),
    getTeams(),
  ]);

  const employees = canCreate
    ? await db.employee.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        orderBy: { firstName: "asc" }
      })
    : [];

  return (
    <TeamsClient 
      initialTeams={teams} 
      employees={employees} 
      canCreate={canCreate} 
    />
  );
}
