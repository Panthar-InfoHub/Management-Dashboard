import { Details, EmailLayout, Paragraph, PrimaryButton, Quote } from "./components/layout";

export type RequestSubmittedEmailProps = {
  approverFirstName: string;
  requesterName: string;
  /** "Leave" or "Work From Home". */
  kindLabel: string;
  leaveType: string | null;
  dates: string;
  /** "3 working days", "Half day (first half)". */
  duration: string;
  reason: string;
  url: string;
  manageUrl: string;
};

export function requestSubmittedSubject(p: Pick<RequestSubmittedEmailProps, "kindLabel" | "requesterName" | "dates">) {
  return `${p.kindLabel} request from ${p.requesterName}: ${p.dates}`;
}

export default function RequestSubmittedEmail(p: RequestSubmittedEmailProps) {
  return (
    <EmailLayout
      preview={`${p.requesterName} asked for ${p.kindLabel.toLowerCase()} on ${p.dates}. It needs your decision.`}
      eyebrow={`${p.kindLabel} Request`}
      heading={`${p.requesterName} requested ${p.kindLabel === "Leave" ? "leave" : "to work from home"}`}
      reason="You received this because you approve requests for this person."
      manageUrl={p.manageUrl}
    >
      <Paragraph>Hi {p.approverFirstName}, this request is waiting for your decision.</Paragraph>
      <Details
        items={[
          { label: "Requested by", value: p.requesterName },
          { label: "Type", value: p.leaveType ? `${p.kindLabel} · ${p.leaveType}` : p.kindLabel },
          { label: "Dates", value: p.dates },
          { label: "Duration", value: p.duration },
        ]}
      />
      <Quote label="Reason">{p.reason}</Quote>
      <PrimaryButton href={p.url}>Review Request</PrimaryButton>
    </EmailLayout>
  );
}

RequestSubmittedEmail.PreviewProps = {
  approverFirstName: "Priya",
  requesterName: "Rahul Verma",
  kindLabel: "Leave",
  leaveType: "Casual Leave",
  dates: "3–5 Dec 2026",
  duration: "3 working days",
  reason: "Attending my sister's wedding in Jaipur.",
  url: "https://teams.example.com/approvals",
  manageUrl: "https://teams.example.com/notifications",
} satisfies RequestSubmittedEmailProps;
