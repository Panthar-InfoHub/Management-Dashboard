// The same skeletons the routes' loading.tsx files show, picked by URL, so the
// skeleton shown on click hands over to the route's own loading state seamlessly.
import DashboardSkeleton from "@/app/(dashboard)/dashboard-skeleton";
import TeamsLoading from "@/app/(dashboard)/teams/skeleton";
import EmployeesLoading from "@/app/(dashboard)/employees/skeleton";
import ProjectsLoading from "@/app/(dashboard)/projects/skeleton";
import TasksLoading from "@/app/(dashboard)/tasks/skeleton";
import CalendarLoading from "@/app/(dashboard)/calendar/loading";
import NotificationsLoading from "@/app/(dashboard)/notifications/loading";
import SettingsLoading from "@/app/(dashboard)/settings/loading";
import UpdatesLoading from "@/app/(dashboard)/updates/loading";
import RecordsLoading from "@/app/(dashboard)/records/loading";

const BY_SECTION: Record<string, () => React.ReactNode> = {
  teams: TeamsLoading,
  employees: EmployeesLoading,
  projects: ProjectsLoading,
  tasks: TasksLoading,
  calendar: CalendarLoading,
  notifications: NotificationsLoading,
  settings: SettingsLoading,
  updates: UpdatesLoading,
  records: RecordsLoading,
};

export function RouteSkeleton({ href }: { href: string }) {
  const section = href.split(/[/?#]/)[1] ?? "";
  // Routes without their own loading.tsx use the dashboard one, as Next.js does.
  const Skeleton = BY_SECTION[section] ?? DashboardSkeleton;
  return <Skeleton />;
}
