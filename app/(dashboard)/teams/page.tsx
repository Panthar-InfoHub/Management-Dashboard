import { getTeams } from "@/lib/queries/team.queries";
import { getEmployees } from "@/lib/queries/employee.queries";
import { TeamsClient } from "@/components/teams/teams-client";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";

export default async function TeamsPage() {
  const currentEmployee = await getCurrentEmployee();
  const teams = await getTeams();
  const employees = await getEmployees();
  const canCreate = await checkPermission("team:create");

  return (
    <TeamsClient 
      initialTeams={JSON.parse(JSON.stringify(teams))} 
      employees={JSON.parse(JSON.stringify(employees))} 
      canCreate={canCreate} 
    />
  );
}
