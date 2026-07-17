import { AppShell } from "@/components/layout/app-shell";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Triggers JIT sync if the webhook didn't fire, ensuring the Employee record exists.
  const employee = await getCurrentEmployee();
  
  return <AppShell isAdmin={employee.role === "ADMIN"}>{children}</AppShell>;
}
