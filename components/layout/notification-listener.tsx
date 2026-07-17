"use client";

import { useEffect, useRef } from "react";
import { getRecentNotificationsAction } from "@/lib/actions/notification.actions";
import { usePathname } from "next/navigation";

export function NotificationListener() {
  const pathname = usePathname();
  const notifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // We intentionally do not auto-request permission here.
    // On iOS Safari and some mobile browsers, calling requestPermission() 
    // outside of a direct user interaction (like a click) will fail silently.
    // Permissions must be granted via the Notifications page.
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkNotifications = async () => {
      try {
        const recent = await getRecentNotificationsAction();
        const unread = recent.filter(n => !n.isRead);

        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          unread.forEach(notification => {
            if (!notifiedIds.current.has(notification.id)) {
              // Trigger browser notification
              const browserNotif = new Notification(notification.title, {
                body: notification.message,
                icon: "/favicon.ico", // Or appropriate icon
              });

              if (notification.actionUrl) {
                browserNotif.onclick = () => {
                  window.focus();
                  window.location.href = notification.actionUrl!;
                };
              }

              notifiedIds.current.add(notification.id);
            }
          });
        }
      } catch (e) {
        console.error("Failed to fetch notifications", e);
      }
    };

    // Initial check
    checkNotifications();

    // Poll every 15 seconds
    interval = setInterval(checkNotifications, 15000);

    return () => clearInterval(interval);
  }, [pathname]); // Re-run when pathname changes to catch immediate updates

  return null;
}
