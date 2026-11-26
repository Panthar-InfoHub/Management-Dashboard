import { db } from "@/lib/db";
import { REQUEST_KIND_LABELS, type RequestKindValue } from "@/lib/leave/rules";
import { taskKey } from "@/lib/tasks/keys";
import { appUrl, sendEmailsLater } from "@/lib/email/send";
import AnnouncementEmail, { announcementSubject } from "@/emails/announcement";
import TaskAssignedEmail, { taskAssignedSubject } from "@/emails/task-assigned";
import TasksOwnedEmail, { tasksOwnedSubject } from "@/emails/tasks-owned";
import RequestSubmittedEmail, { requestSubmittedSubject } from "@/emails/request-submitted";
import RequestDecidedEmail, { requestDecidedSubject } from "@/emails/request-decided";

// Which events send email. Deliberately few: announcements, task assignment,
// and leave / WFH requests. Everything else stays in-app only.
// Internal helpers — NOT Server Actions. Call them from already-authorized actions.

const TZ = "Asia/Kolkata";
const PRIORITY: Record<string, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" };
const manageUrl = () => appUrl("/notifications");

/** Active people with an email, by id. */
async function recipients(ids: string[]) {
  if (ids.length === 0) return [];
  return db.employee.findMany({
    where: { id: { in: [...new Set(ids)] }, status: "ACTIVE" },
    select: { id: true, email: true, firstName: true },
  });
}

function formatDate(d: Date, timeZone = TZ) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone });
}

/** Date-only range ("3–5 Dec 2026"). Stored as UTC midnight. */
function formatRange(start: Date, end: Date) {
  const s = start.toISOString().slice(0, 10), e = end.toISOString().slice(0, 10);
  if (s === e) return formatDate(start, "UTC");
  const sameMonth = s.slice(0, 7) === e.slice(0, 7);
  const sameYear = s.slice(0, 4) === e.slice(0, 4);
  const first = start.toLocaleDateString("en-IN", { day: "numeric", ...(sameMonth ? {} : { month: "short" }), ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" });
  return `${first}–${formatDate(end, "UTC")}`;
}

function formatDuration(r: { kind: string; days: number; halfDay: string | null }) {
  if (r.halfDay) return `Half day (${r.halfDay === "FIRST_HALF" ? "first half" : "second half"})`;
  const unit = r.kind === "WFH" ? "office day" : "working day";
  return `${r.days} ${unit}${r.days === 1 ? "" : "s"}`;
}

function excerpt(text: string | null, max = 600) {
  const t = text?.trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}

// ─── Announcements ───

export function emailAnnouncement(announcementId: string, recipientIds: string[]) {
  if (recipientIds.length === 0) return;
  sendEmailsLater(`announcement/${announcementId}`, async () => {
    const post = await db.announcement.findUnique({
      where: { id: announcementId },
      select: { title: true, body: true, teamIds: true, createdAt: true, author: { select: { firstName: true, lastName: true } } },
    });
    if (!post) return [];
    const teams = post.teamIds.length
      ? (await db.team.findMany({ where: { id: { in: post.teamIds } }, select: { name: true }, orderBy: { name: "asc" } })).map((t) => t.name)
      : [];
    const props = {
      title: post.title,
      body: post.body,
      authorName: `${post.author.firstName} ${post.author.lastName}`,
      audience: teams.length ? teams.join(", ") : "Everyone",
      postedOn: formatDate(post.createdAt),
      url: appUrl("/announcements"),
      manageUrl: manageUrl(),
    };
    const subject = announcementSubject(props);
    return (await recipients(recipientIds)).map((r) => ({ to: r.email, subject, react: <AnnouncementEmail {...props} /> }));
  });
}

// ─── Tasks ───

export function emailTaskAssigned(taskId: string, recipientIds: string[], actorName: string, reason: "assigned" | "owner") {
  if (recipientIds.length === 0) return;
  sendEmailsLater(`task-${reason}/${taskId}`, async () => {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: {
        title: true, number: true, projectId: true, priority: true, dueDate: true, description: true,
        project: { select: { name: true, key: true } },
        parent: { select: { title: true } },
      },
    });
    if (!task) return [];
    const base = {
      reason,
      taskKey: taskKey(task),
      title: task.title,
      project: task.project?.name ?? "General",
      priority: PRIORITY[task.priority] ?? task.priority,
      dueDate: task.dueDate ? formatDate(task.dueDate) : null,
      parentTitle: task.parent?.title ?? null,
      description: excerpt(task.description),
      assignedBy: actorName,
      url: appUrl(`/tasks/${taskId}`),
      manageUrl: manageUrl(),
    };
    const subject = taskAssignedSubject(base);
    return (await recipients(recipientIds)).map((r) => ({
      to: r.email,
      subject,
      react: <TaskAssignedEmail {...base} recipientFirstName={r.firstName} />,
    }));
  });
}

const OWNED_LIST_LIMIT = 25;

/** Many tasks given to one Owner at once (bulk edit): one email listing them. */
export function emailTasksOwned(taskIds: string[], ownerId: string, actorName: string) {
  if (taskIds.length === 0) return;
  sendEmailsLater(`tasks-owned/${ownerId}`, async () => {
    const [owner] = await recipients([ownerId]);
    if (!owner) return [];
    const tasks = await db.task.findMany({
      where: { id: { in: taskIds } },
      select: { id: true, title: true, number: true, projectId: true, dueDate: true, project: { select: { name: true, key: true } } },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    });
    const listed = tasks.slice(0, OWNED_LIST_LIMIT).map((t) => ({
      taskKey: taskKey(t),
      title: t.title,
      project: t.project?.name ?? "General",
      dueDate: t.dueDate ? formatDate(t.dueDate) : null,
      url: appUrl(`/tasks/${t.id}`),
    }));
    const props = {
      recipientFirstName: owner.firstName,
      assignedBy: actorName,
      tasks: listed,
      more: tasks.length - listed.length,
      url: appUrl("/tasks/my"),
      manageUrl: manageUrl(),
    };
    return [{ to: owner.email, subject: tasksOwnedSubject(props), react: <TasksOwnedEmail {...props} /> }];
  });
}

// ─── Leave and WFH requests ───

const EMAILED_KINDS = new Set(["LEAVE", "WFH"]);

async function loadRequest(requestId: string) {
  return db.request.findUnique({
    where: { id: requestId },
    select: {
      kind: true, startDate: true, endDate: true, days: true, halfDay: true, reason: true, status: true, decisionNote: true,
      employeeId: true,
      employee: { select: { firstName: true, lastName: true } },
      leaveType: { select: { name: true } },
      decidedBy: { select: { firstName: true, lastName: true } },
    },
  });
}

/** A new leave or WFH request, to the people who can approve it. */
export function emailRequestSubmitted(requestId: string, kind: string, approverIds: string[]) {
  if (!EMAILED_KINDS.has(kind) || approverIds.length === 0) return;
  sendEmailsLater(`request-submitted/${requestId}`, async () => {
    const r = await loadRequest(requestId);
    if (!r || r.status !== "PENDING") return [];
    const base = {
      requesterName: `${r.employee.firstName} ${r.employee.lastName}`,
      kindLabel: REQUEST_KIND_LABELS[r.kind as RequestKindValue],
      leaveType: r.leaveType?.name ?? null,
      dates: formatRange(r.startDate, r.endDate),
      duration: formatDuration(r),
      reason: r.reason,
      url: appUrl("/approvals"),
      manageUrl: manageUrl(),
    };
    const subject = requestSubmittedSubject(base);
    return (await recipients(approverIds)).map((a) => ({
      to: a.email,
      subject,
      react: <RequestSubmittedEmail {...base} approverFirstName={a.firstName} />,
    }));
  });
}

/** A leave or WFH request was approved or rejected, to the person who asked. */
export function emailRequestDecided(requestId: string, kind: string) {
  if (!EMAILED_KINDS.has(kind)) return;
  sendEmailsLater(`request-decided/${requestId}`, async () => {
    const r = await loadRequest(requestId);
    if (!r || (r.status !== "APPROVED" && r.status !== "REJECTED")) return [];
    const [person] = await recipients([r.employeeId]);
    if (!person) return [];
    const props = {
      recipientFirstName: person.firstName,
      kindLabel: REQUEST_KIND_LABELS[r.kind as RequestKindValue],
      leaveType: r.leaveType?.name ?? null,
      decision: r.status === "APPROVED" ? ("Approved" as const) : ("Rejected" as const),
      decidedBy: r.decidedBy ? `${r.decidedBy.firstName} ${r.decidedBy.lastName}` : "Your approver",
      dates: formatRange(r.startDate, r.endDate),
      duration: formatDuration(r),
      note: r.decisionNote,
      url: appUrl("/leave"),
      manageUrl: manageUrl(),
    };
    return [{ to: person.email, subject: requestDecidedSubject(props), react: <RequestDecidedEmail {...props} /> }];
  });
}
