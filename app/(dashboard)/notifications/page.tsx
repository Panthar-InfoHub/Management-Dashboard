import { getRecentNotificationsAction } from "@/lib/actions/notification.actions";
import { NotificationsClient } from "@/components/notifications/notifications-client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">Stay up to date with your team.</p>
        </div>
      </div>
      
      <Suspense fallback={
        <div className="space-y-4">
          <div className="flex justify-end">
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      }>
        <NotificationsDataAsync />
      </Suspense>
    </div>
  );
}

async function NotificationsDataAsync() {
  const notifications = await getRecentNotificationsAction();
  return <NotificationsClient initialNotifications={notifications} />;
}
