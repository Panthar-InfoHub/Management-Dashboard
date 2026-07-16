import { getEmployees } from "@/lib/queries/employee.queries";
import { getCurrentEmployee } from "@/lib/auth";
import { EmployeesClient } from "@/components/employees/employees-client";
import { getTeams } from "@/lib/queries/team.queries";

export default async function EmployeesPage() {
  const currentEmployee = await getCurrentEmployee();
  const employees = await getEmployees();
  const teams = await getTeams();

  return (
    <EmployeesClient 
      initialEmployees={JSON.parse(JSON.stringify(employees))} 
      teams={JSON.parse(JSON.stringify(teams))}
      isAdmin={currentEmployee.role === "ADMIN"} 
    />
  );
}
