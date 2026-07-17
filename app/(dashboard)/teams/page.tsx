import { Suspense } from "react";
import { getTeams } from "@/lib/queries/team.queries";
import { getEmployees } from "@/lib/queries/employee.queries";
import { TeamsClient } from "@/components/teams/teams-client";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import TeamsLoading from "./loading";

async function TeamsData({ canCreate }: { canCreate: boolean }) {
  const teams = await getTeams();
  const employees = await getEmployees();
  return (
    <TeamsClient 
      initialTeams={JSON.parse(JSON.stringify(teams))} 
      employees={JSON.parse(JSON.stringify(employees))} 
      canCreate={canCreate} 
    />
  );
}

export default async function TeamsPage() {
  await getCurrentEmployee(); // fetch fast auth for shell
  const canCreate = await checkPermission("team:create");

  return (
    <Suspense fallback={<TeamsLoading />}>
      <TeamsData canCreate={canCreate} />
    </Suspense>
  );
}
