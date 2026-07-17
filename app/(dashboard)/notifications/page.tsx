import { getRecentNotificationsAction } from "@/lib/actions/notification.actions";
import { NotificationsClient } from "@/components/notifications/notifications-client";

export default async function NotificationsPage() {
  const notifications = await getRecentNotificationsAction();

  return <NotificationsClient initialNotifications={notifications} />;
}
