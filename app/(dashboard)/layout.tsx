import { AppShell } from "@/components/layout/app-shell";
import { getCurrentEmployee } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Triggers JIT sync if the webhook didn't fire, ensuring the Employee record exists.
  const employee = await getCurrentEmployee();
  const isAdmin = employee.role === "ADMIN" || employee.role === "MANAGER";
  
  return <AppShell isAdmin={isAdmin}>{children}</AppShell>;
}
