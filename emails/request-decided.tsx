import { Details, EmailLayout, Paragraph, PrimaryButton, Quote } from "./components/layout";

export type RequestDecidedEmailProps = {
  recipientFirstName: string;
  /** "Leave" or "Work From Home". */
  kindLabel: string;
  leaveType: string | null;
  decision: "Approved" | "Rejected";
  decidedBy: string;
  dates: string;
  duration: string;
  note: string | null;
  url: string;
  manageUrl: string;
};

export function requestDecidedSubject(p: Pick<RequestDecidedEmailProps, "kindLabel" | "decision" | "dates">) {
  return `Your ${p.kindLabel.toLowerCase()} request for ${p.dates} was ${p.decision.toLowerCase()}`;
}

export default function RequestDecidedEmail(p: RequestDecidedEmailProps) {
  const approved = p.decision === "Approved";
  const kind = p.kindLabel === "Leave" ? "leave" : "work from home";
  return (
    <EmailLayout
      preview={`${p.decidedBy} ${p.decision.toLowerCase()} your ${p.kindLabel.toLowerCase()} request for ${p.dates}.`}
      eyebrow={`${p.kindLabel} Request · ${p.decision}`}
      heading={`Your ${kind} request was ${p.decision.toLowerCase()}`}
      reason="You received this because a decision was made on your request."
      manageUrl={p.manageUrl}
    >
      <Paragraph>
        Hi {p.recipientFirstName}, {p.decidedBy} {p.decision.toLowerCase()} your request.{" "}
        {approved
          ? p.kindLabel === "Leave"
            ? "Your leave balance has been updated."
            : "Your attendance on these days will be recorded as Work From Home."
          : "If you still need this time, talk to your approver or submit a new request."}
      </Paragraph>
      <Details
        items={[
          { label: "Status", value: p.decision },
          { label: "Type", value: p.leaveType ? `${p.kindLabel} · ${p.leaveType}` : p.kindLabel },
          { label: "Dates", value: p.dates },
          { label: "Duration", value: p.duration },
          { label: "Decided by", value: p.decidedBy },
        ]}
      />
      {p.note && <Quote label="Note from approver">{p.note}</Quote>}
      <PrimaryButton href={p.url}>View Request</PrimaryButton>
    </EmailLayout>
  );
}

RequestDecidedEmail.PreviewProps = {
  recipientFirstName: "Rahul",
  kindLabel: "Leave",
  leaveType: "Casual Leave",
  decision: "Approved",
  decidedBy: "Priya Sharma",
  dates: "3–5 Dec 2026",
  duration: "3 working days",
  note: "Enjoy the wedding. Please hand over the release checklist to Anil before you go.",
  url: "https://teams.example.com/leave",
  manageUrl: "https://teams.example.com/notifications",
} satisfies RequestDecidedEmailProps;
