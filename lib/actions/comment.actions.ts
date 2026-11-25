"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentEmployee, checkPermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

const MAX_COMMENT_LENGTH = 5000;

function cleanContent(content: string) {
  const text = content?.trim() ?? "";
  if (!text) throw new Error("Comment can't be empty.");
  if (text.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment is too long. Keep it under ${MAX_COMMENT_LENGTH} characters.`);
  }
  return text;
}

/** Same rule as viewing the task: involved people, or task:update on the project. */
async function getTaskForCommenter(taskId: string, employeeId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      projectId: true,
      creatorId: true,
      assignees: { select: { id: true } },
      project: { select: { members: { select: { employeeId: true } } } },
    },
  });
  if (!task) throw new Error("Task not found");

  const involved =
    task.creatorId === employeeId ||
    task.assignees.some((a) => a.id === employeeId) ||
    task.project.members.some((m) => m.employeeId === employeeId);
  if (!involved && !(await checkPermission("task:update", task.projectId))) {
    throw new Error("You do not have permission to comment on this task.");
  }
  return task;
}

export async function addCommentAction(taskId: string, content: string) {
  const text = cleanContent(content);
  const employee = await getCurrentEmployee();
  const task = await getTaskForCommenter(taskId, employee.id);

  const comment = await db.comment.create({
    data: { taskId, content: text, authorId: employee.id },
    include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
  });

  // Tell the creator and assignees, except the person who wrote it.
  const recipients = new Set([task.creatorId, ...task.assignees.map((a) => a.id)]);
  recipients.delete(employee.id);
  if (recipients.size > 0) {
    await db.notification.createMany({
      data: [...recipients].map((recipientId) => ({
        recipientId,
        type: "TASK_COMMENT",
        title: "New Comment",
        message: `${employee.firstName} commented on: ${task.title}`,
        actionUrl: `/tasks/${taskId}`,
      })),
    });
  }

  audit({ actorId: employee.id, entity: "Comment", entityId: comment.id, action: "create", changes: { taskId } });
  revalidatePath(`/tasks/${taskId}`);
  return { success: true, comment };
}

export async function updateCommentAction(commentId: string, content: string) {
  const text = cleanContent(content);
  const employee = await getCurrentEmployee();

  const existing = await db.comment.findUnique({ where: { id: commentId }, select: { authorId: true, taskId: true, content: true } });
  if (!existing) throw new Error("Comment not found");
  if (existing.authorId !== employee.id) throw new Error("You can only edit your own comments.");

  const comment = await db.comment.update({
    where: { id: commentId },
    data: { content: text, editedAt: new Date() },
  });

  audit({ actorId: employee.id, entity: "Comment", entityId: commentId, action: "update", changes: { content: [existing.content, text] } });
  revalidatePath(`/tasks/${existing.taskId}`);
  return { success: true, comment };
}

export async function deleteCommentAction(commentId: string) {
  const employee = await getCurrentEmployee();

  const existing = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, taskId: true, task: { select: { projectId: true } } },
  });
  if (!existing) throw new Error("Comment not found");

  const isAuthor = existing.authorId === employee.id;
  if (!isAuthor && !(await checkPermission("task:delete", existing.task.projectId))) {
    throw new Error("You can only delete your own comments.");
  }

  await db.comment.delete({ where: { id: commentId } });

  audit({ actorId: employee.id, entity: "Comment", entityId: commentId, action: "delete", changes: { taskId: existing.taskId } });
  revalidatePath(`/tasks/${existing.taskId}`);
  return { success: true };
}
