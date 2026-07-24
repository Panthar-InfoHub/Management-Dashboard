import { AppShell } from "@/components/layout/app-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // No async work here — the layout renders instantly so loading.tsx can
  // show immediately on navigation.  isAdmin is derived client-side from
  // Clerk's publicMetadata (already in the JWT, no DB call needed).
  return <AppShell>{children}</AppShell>;
}
