import type { ReactNode } from "react";
import { Body, Button, Column, Container, Head, Heading, Html, Link, Preview, Row, Section, Text } from "react-email";

// Shared frame for every Panthar Teams email. Plain, high-contrast, no imagery:
// a text wordmark, one card, one primary action, and a short footer saying
// why the email was sent.

export const colors = {
  page: "#fafafa",
  surface: "#ffffff",
  border: "#eaeaea",
  text: "#171717",
  secondary: "#666666",
  button: "#171717",
};

const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export function EmailLayout({
  preview,
  eyebrow,
  heading,
  children,
  reason,
  manageUrl,
}: {
  preview: string;
  /** Small label above the heading, e.g. "Leave Request". */
  eyebrow?: string;
  heading: string;
  children: ReactNode;
  /** Footer line: why this person got the email. */
  reason: string;
  manageUrl: string;
}) {
  return (
    <Html lang="en">
      <Head />
      <Body style={{ backgroundColor: colors.page, margin: 0, padding: "40px 0", fontFamily: fontStack, color: colors.text }}>
        <Preview>{preview}</Preview>
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "0 16px" }}>
          <Text style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.01em", margin: "0 0 16px", color: colors.text }}>
            Panthar Teams
          </Text>

          <Section
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: "6px",
              padding: "32px",
            }}
          >
            {eyebrow && (
              <Text style={{ fontSize: "12px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: colors.secondary, margin: "0 0 8px" }}>
                {eyebrow}
              </Text>
            )}
            <Heading as="h1" style={{ fontSize: "22px", lineHeight: "30px", fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 16px", color: colors.text }}>
              {heading}
            </Heading>
            {children}
          </Section>

          <Text style={{ fontSize: "12px", lineHeight: "18px", color: colors.secondary, margin: "24px 0 0" }}>
            {reason} You can see all your updates on the{" "}
            <Link href={manageUrl} style={{ color: colors.secondary, textDecoration: "underline" }}>
              notifications page
            </Link>
            .
          </Text>
          <Text style={{ fontSize: "12px", lineHeight: "18px", color: colors.secondary, margin: "4px 0 0" }}>
            Panthar InfoHub
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function Paragraph({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: "14px", lineHeight: "22px", color: colors.text, margin: "0 0 16px" }}>{children}</Text>;
}

/** Label/value pairs separated by hairlines. Empty values are left out. */
export function Details({ items }: { items: { label: string; value: string | null | undefined }[] }) {
  const rows = items.filter((i) => i.value);
  if (rows.length === 0) return null;
  return (
    <Section style={{ margin: "8px 0 24px", borderTop: `1px solid ${colors.border}` }}>
      {rows.map((row) => (
        <Row key={row.label} style={{ borderBottom: `1px solid ${colors.border}` }}>
          <Column style={{ width: "140px", padding: "10px 12px 10px 0", verticalAlign: "top", fontSize: "13px", lineHeight: "20px", color: colors.secondary }}>
            {row.label}
          </Column>
          <Column style={{ padding: "10px 0", verticalAlign: "top", fontSize: "14px", lineHeight: "20px", color: colors.text }}>{row.value}</Column>
        </Row>
      ))}
    </Section>
  );
}

/** Quoted free text written by a person (reason, note, announcement body). Line breaks kept. */
export function Quote({ label, children }: { label?: string; children: string }) {
  return (
    <Section style={{ margin: "0 0 24px" }}>
      {label && <Text style={{ fontSize: "13px", lineHeight: "20px", color: colors.secondary, margin: "0 0 6px" }}>{label}</Text>}
      <Text
        style={{
          fontSize: "14px",
          lineHeight: "22px",
          color: colors.text,
          margin: 0,
          padding: "2px 0 2px 14px",
          borderLeft: `2px solid ${colors.border}`,
          whiteSpace: "pre-line",
          wordBreak: "break-word",
        }}
      >
        {children}
      </Text>
    </Section>
  );
}

/** The single primary action of the email. */
export function PrimaryButton({ href, children }: { href: string; children: string }) {
  return (
    <Section style={{ margin: "8px 0 0" }}>
      <Button
        href={href}
        style={{
          backgroundColor: colors.button,
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: 500,
          lineHeight: "20px",
          borderRadius: "6px",
          padding: "10px 18px",
          textDecoration: "none",
          boxSizing: "border-box",
        }}
      >
        {children}
      </Button>
      <Text style={{ fontSize: "12px", lineHeight: "18px", color: colors.secondary, margin: "16px 0 0", wordBreak: "break-all" }}>
        Or open this link: <Link href={href} style={{ color: colors.secondary }}>{href}</Link>
      </Text>
    </Section>
  );
}
