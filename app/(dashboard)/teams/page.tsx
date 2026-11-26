import { Suspense } from "react";
import { connection } from "next/server";
import { getTeams } from "@/lib/queries/team.queries";
import { TeamsClient } from "@/components/teams/teams-client";
import { checkPermission, getCurrentEmployee } from "@/lib/auth";
import { db } from "@/lib/db";
import { TeamsBodySkeleton } from "./skeleton";

export default function TeamsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <Suspense fallback={<TeamsBodySkeleton />}>
        <TeamsDataAsync />
      </Suspense>
    </div>
  );
}

async function TeamsDataAsync() {
  await connection();
  await getCurrentEmployee();
  const [canCreate, teams, employees] = await Promise.all([
    checkPermission("team:create"),
    getTeams(),
    db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      orderBy: { firstName: "asc" },
    }),
  ]);
  return <TeamsClient initialTeams={teams} employees={canCreate ? employees : []} canCreate={canCreate} />;
}
