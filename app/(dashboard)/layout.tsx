import { AppShell } from "@/components/layout/app-shell";
import { getCurrentEmployee } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Triggers JIT sync if the webhook didn't fire, ensuring the Employee record exists.
  await getCurrentEmployee();
  
  return <AppShell>{children}</AppShell>;
}
