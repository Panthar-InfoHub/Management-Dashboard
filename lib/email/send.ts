import type { ReactElement } from "react";
import { after } from "next/server";
import { Resend } from "resend";

// Email delivery through Resend. Internal helper — NOT a Server Action.
//
// Emails go out after the response (next/server `after`), so a slow or failing
// email never slows down or fails the action that triggered it. Failures are
// logged; the in-app notification is the source of truth.
//
// Env:
//   RESEND_API_KEY     required to send at all
//   EMAIL_FROM         required, a sender on a verified domain, e.g. "Panthar Teams <teams@panthar.in>"
//   EMAIL_REPLY_TO     optional
//   APP_URL            public base URL used in links, e.g. "https://teams.panthar.in"
//   EMAIL_REDIRECT_TO  send every email to this one address instead (testing).
//                      Outside production, email is only sent when this is set,
//                      so local dev against a real database never emails staff.

export type OutgoingEmail = {
  to: string;
  subject: string;
  react: ReactElement;
};

const BATCH_LIMIT = 100;

type Config = { client: Resend; from: string; replyTo?: string; redirectTo?: string };

let cached: Config | null | undefined;
function config(): Config | null {
  if (cached !== undefined) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const redirectTo = process.env.EMAIL_REDIRECT_TO?.trim() || undefined;
  const production = process.env.NODE_ENV === "production";
  if (!apiKey || !from) {
    console.info("[email] RESEND_API_KEY or EMAIL_FROM not set; emails are off.");
    cached = null;
  } else if (!production && !redirectTo) {
    console.info("[email] Not production and EMAIL_REDIRECT_TO not set; emails are off.");
    cached = null;
  } else {
    cached = { client: new Resend(apiKey), from, replyTo: process.env.EMAIL_REPLY_TO || undefined, redirectTo };
  }
  return cached;
}

/** Absolute link into the app, for use in emails. */
export function appUrl(path: string) {
  const base =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return new URL(path, base).toString();
}

/**
 * Build and send emails once the response is done. `build` runs after the
 * response too, so its database lookups don't slow the action down.
 * `event` names the send for logs and idempotency, e.g. "announcement/clx123".
 */
export function sendEmailsLater(event: string, build: () => Promise<OutgoingEmail[]>) {
  const cfg = config();
  if (!cfg) return;
  // A unique key per call: protects our own retry from double-sending, while a
  // genuine repeat (e.g. reassigned later) still sends.
  const key = `${event}/${Date.now().toString(36)}`;
  after(async () => {
    try {
      const emails = (await build()).filter((e) => e.to);
      if (emails.length) await deliver(cfg, key, emails);
    } catch (err) {
      console.error(`[email] ${event} failed`, err);
    }
  });
}

async function deliver(cfg: Config, key: string, emails: OutgoingEmail[]) {
  for (let i = 0; i < emails.length; i += BATCH_LIMIT) {
    const chunk = emails.slice(i, i + BATCH_LIMIT).map((e) => ({
      from: cfg.from,
      to: cfg.redirectTo ?? e.to,
      subject: cfg.redirectTo ? `[to ${e.to}] ${e.subject}` : e.subject,
      react: e.react,
      ...(cfg.replyTo ? { replyTo: cfg.replyTo } : {}),
    }));
    const idempotencyKey = `batch-${key}/${i / BATCH_LIMIT}`.slice(0, 256);
    await sendChunk(cfg, chunk, idempotencyKey);
    // Stay under Resend's per-second request limit on large announcements.
    if (i + BATCH_LIMIT < emails.length) await sleep(600);
  }
}

async function sendChunk(cfg: Config, chunk: Parameters<Resend["batch"]["send"]>[0], idempotencyKey: string) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    // The SDK returns { data, error } rather than throwing. "permissive" sends
    // the valid emails even if one address is bad.
    const { data, error } = await cfg.client.batch.send(chunk, { idempotencyKey, batchValidation: "permissive" });
    if (!error) {
      const failed = (data as { errors?: { index: number; message: string }[] } | null)?.errors ?? [];
      for (const f of failed) console.error(`[email] Not sent to ${chunk[f.index]?.to}: ${f.message}`);
      return;
    }
    const retryable = error.name === "rate_limit_exceeded" || error.name === "application_error" || error.name === "internal_server_error";
    if (!retryable || attempt === 2) {
      console.error(`[email] Batch failed (${error.name}): ${error.message}`);
      return;
    }
    await sleep(1500);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
