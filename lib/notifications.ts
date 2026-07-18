import { db } from "@/lib/db";

// Internal helper — intentionally NOT a Server Action.
// Only ever called from within other, already-authorized Server Actions
// (task/project mutations) so it can't be invoked directly by a client
// with an arbitrary recipientId.
export async function createNotification(data: {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
}) {
  return db.notification.create({ data });
}
