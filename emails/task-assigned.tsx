import { Details, EmailLayout, Paragraph, PrimaryButton, Quote } from "./components/layout";

export type TaskAssignedEmailProps = {
  recipientFirstName: string;
  /** "assigned": added as an assignee. "owner": made the task's Owner. */
  reason: "assigned" | "owner";
  /** "JNV-24", if the task has one. */
  taskKey: string | null;
  title: string;
  /** Project name, or "General" for tasks outside a project. */
  project: string;
  priority: string;
  dueDate: string | null;
  parentTitle: string | null;
  description: string | null;
  assignedBy: string;
  url: string;
  manageUrl: string;
};

export function taskAssignedSubject(p: Pick<TaskAssignedEmailProps, "reason" | "taskKey" | "title">) {
  const name = p.taskKey ? `${p.taskKey}: ${p.title}` : p.title;
  return p.reason === "owner" ? `You now own ${name}` : `Assigned to you: ${name}`;
}

export default function TaskAssignedEmail(p: TaskAssignedEmailProps) {
  const lead =
    p.reason === "owner"
      ? `${p.assignedBy} made you the owner of this task. You're responsible for seeing it through to done.`
      : `${p.assignedBy} assigned you to this task.`;
  return (
    <EmailLayout
      preview={`${p.assignedBy} ${p.reason === "owner" ? "made you the owner of" : "assigned you"} ${p.taskKey ?? p.title}`}
      eyebrow={p.taskKey ? `${p.project} · ${p.taskKey}` : p.project}
      heading={p.title}
      reason={p.reason === "owner" ? "You received this because you were made the owner of a task." : "You received this because you were assigned to a task."}
      manageUrl={p.manageUrl}
    >
      <Paragraph>
        Hi {p.recipientFirstName}, {lead}
      </Paragraph>
      <Details
        items={[
          { label: "Project", value: p.project },
          { label: "Main task", value: p.parentTitle },
          { label: "Priority", value: p.priority },
          { label: "Due", value: p.dueDate ?? "No due date" },
          { label: "Assigned by", value: p.assignedBy },
        ]}
      />
      {p.description && <Quote label="Description">{p.description}</Quote>}
      <PrimaryButton href={p.url}>Open Task</PrimaryButton>
    </EmailLayout>
  );
}

TaskAssignedEmail.PreviewProps = {
  recipientFirstName: "Rahul",
  reason: "assigned",
  taskKey: "JNV-24",
  title: "Add offline support to the attendance punch screen",
  project: "Jan Vikas",
  priority: "High",
  dueDate: "4 Dec 2026",
  parentTitle: null,
  description: "Queue punches while the device is offline and sync them when the connection returns. Show the queued state on the clock card.",
  assignedBy: "Priya Sharma",
  url: "https://teams.example.com/tasks/abc123",
  manageUrl: "https://teams.example.com/notifications",
} satisfies TaskAssignedEmailProps;
