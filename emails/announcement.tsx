import { Details, EmailLayout, PrimaryButton, Quote } from "./components/layout";

export type AnnouncementEmailProps = {
  title: string;
  body: string;
  authorName: string;
  /** "Everyone", or the team names it was posted to. */
  audience: string;
  postedOn: string;
  url: string;
  manageUrl: string;
};

export function announcementSubject(p: Pick<AnnouncementEmailProps, "title">) {
  return `Announcement: ${p.title}`;
}

export default function AnnouncementEmail(p: AnnouncementEmailProps) {
  return (
    <EmailLayout
      preview={p.body.replace(/\s+/g, " ").slice(0, 140)}
      eyebrow="Announcement"
      heading={p.title}
      reason={p.audience === "Everyone" ? "You received this because it was posted to everyone at Panthar." : `You received this because it was posted to ${p.audience}.`}
      manageUrl={p.manageUrl}
    >
      <Quote>{p.body}</Quote>
      <Details
        items={[
          { label: "Posted by", value: p.authorName },
          { label: "Posted on", value: p.postedOn },
          { label: "Audience", value: p.audience },
        ]}
      />
      <PrimaryButton href={p.url}>View Announcements</PrimaryButton>
    </EmailLayout>
  );
}

AnnouncementEmail.PreviewProps = {
  title: "Office closed on Friday for maintenance",
  body: "The office will be closed this Friday, 28 November, while the electrical work on the second floor is completed.\n\nPlease work from home that day. Attendance will be marked as WFH automatically, so there is no need to raise a request.\n\nThe office reopens on Monday at the usual time.",
  authorName: "Priya Sharma",
  audience: "Everyone",
  postedOn: "26 Nov 2026",
  url: "https://teams.example.com/announcements",
  manageUrl: "https://teams.example.com/notifications",
} satisfies AnnouncementEmailProps;
