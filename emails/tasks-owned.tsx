import { Column, Link, Row, Section, Text } from "react-email";
import { EmailLayout, Paragraph, PrimaryButton, colors } from "./components/layout";

export type OwnedTask = {
  taskKey: string | null;
  title: string;
  project: string;
  dueDate: string | null;
  url: string;
};

export type TasksOwnedEmailProps = {
  recipientFirstName: string;
  assignedBy: string;
  tasks: OwnedTask[];
  /** Tasks beyond the ones listed. */
  more: number;
  url: string;
  manageUrl: string;
};

export function tasksOwnedSubject(p: Pick<TasksOwnedEmailProps, "tasks" | "more">) {
  return `You now own ${p.tasks.length + p.more} tasks`;
}

export default function TasksOwnedEmail(p: TasksOwnedEmailProps) {
  const total = p.tasks.length + p.more;
  return (
    <EmailLayout
      preview={`${p.assignedBy} made you the owner of ${total} tasks.`}
      eyebrow="Tasks"
      heading={`You now own ${total} tasks`}
      reason="You received this because you were made the owner of tasks."
      manageUrl={p.manageUrl}
    >
      <Paragraph>
        Hi {p.recipientFirstName}, {p.assignedBy} made you the owner of these tasks. You&rsquo;re responsible for seeing them through to done.
      </Paragraph>

      <Section style={{ margin: "8px 0 24px", borderTop: `1px solid ${colors.border}` }}>
        {p.tasks.map((t) => (
          <Row key={t.url} style={{ borderBottom: `1px solid ${colors.border}` }}>
            <Column style={{ padding: "10px 12px 10px 0", verticalAlign: "top" }}>
              <Link href={t.url} style={{ fontSize: "14px", lineHeight: "20px", color: colors.text, textDecoration: "none", fontWeight: 500 }}>
                {t.taskKey ? `${t.taskKey}  ${t.title}` : t.title}
              </Link>
              <Text style={{ fontSize: "13px", lineHeight: "18px", color: colors.secondary, margin: "2px 0 0" }}>{t.project}</Text>
            </Column>
            <Column style={{ width: "110px", padding: "10px 0", verticalAlign: "top", textAlign: "right", fontSize: "13px", lineHeight: "20px", color: colors.secondary }}>
              {t.dueDate ? `Due ${t.dueDate}` : "No due date"}
            </Column>
          </Row>
        ))}
        {p.more > 0 && (
          <Text style={{ fontSize: "13px", lineHeight: "20px", color: colors.secondary, margin: "10px 0 0" }}>
            And {p.more} more {p.more === 1 ? "task" : "tasks"}.
          </Text>
        )}
      </Section>

      <PrimaryButton href={p.url}>View My Tasks</PrimaryButton>
    </EmailLayout>
  );
}

TasksOwnedEmail.PreviewProps = {
  recipientFirstName: "Rahul",
  assignedBy: "Priya Sharma",
  tasks: [
    { taskKey: "JNV-24", title: "Add offline support to the attendance punch screen", project: "Jan Vikas", dueDate: "4 Dec 2026", url: "https://teams.example.com/tasks/a" },
    { taskKey: "JNV-31", title: "Export monthly attendance as Excel", project: "Jan Vikas", dueDate: "10 Dec 2026", url: "https://teams.example.com/tasks/b" },
    { taskKey: "GEN-7", title: "Update the onboarding checklist", project: "General", dueDate: null, url: "https://teams.example.com/tasks/c" },
  ],
  more: 0,
  url: "https://teams.example.com/tasks/my",
  manageUrl: "https://teams.example.com/notifications",
} satisfies TasksOwnedEmailProps;
