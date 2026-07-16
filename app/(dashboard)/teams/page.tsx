import { getTeams } from "@/lib/queries/team.queries";
import { getEmployees } from "@/lib/queries/employee.queries";
import { TeamsClient } from "@/components/teams/teams-client";
import { getCurrentEmployee } from "@/lib/auth";

export default async function TeamsPage() {
  const currentEmployee = await getCurrentEmployee();
  const teams = await getTeams();
  const employees = await getEmployees();

  return (
    <TeamsClient 
      initialTeams={JSON.parse(JSON.stringify(teams))} 
      employees={JSON.parse(JSON.stringify(employees))} 
      isAdmin={currentEmployee.role === "ADMIN"} 
    />
  );
}
