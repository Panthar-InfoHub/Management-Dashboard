"use server";

import { db } from "@/lib/db";
import { getCurrentEmployee } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createNotificationAction(data: {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
}) {
  const notification = await db.notification.create({
    data
  });
  
  return notification;
}

export async function getUnreadNotificationsCountAction() {
  const employee = await getCurrentEmployee();
  if (!employee) return 0;
  
  return await db.notification.count({
    where: { recipientId: employee.id, isRead: false }
  });
}

export async function getRecentNotificationsAction() {
  const employee = await getCurrentEmployee();
  if (!employee) return [];
  
  return await db.notification.findMany({
    where: { recipientId: employee.id },
    orderBy: { createdAt: "desc" },
    take: 10
  });
}

export async function markNotificationAsReadAction(id: string) {
  const employee = await getCurrentEmployee();
  if (!employee) return;
  
  await db.notification.updateMany({
    where: { id, recipientId: employee.id },
    data: { isRead: true }
  });
  
  revalidatePath("/", "layout");
}

export async function markAllNotificationsAsReadAction() {
  const employee = await getCurrentEmployee();
  if (!employee) return;
  
  await db.notification.updateMany({
    where: { recipientId: employee.id, isRead: false },
    data: { isRead: true }
  });
  
  revalidatePath("/", "layout");
}
