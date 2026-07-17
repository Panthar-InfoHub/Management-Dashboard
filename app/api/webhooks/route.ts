// ── Clerk Webhook Handler ──
// Syncs Clerk user events → our Employee table.
// On user.created: creates Employee record + initializes leave balances.
// On user.updated: syncs email/name changes.
// On user.deleted: soft-deletes (sets INACTIVE).

import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("[Webhook] Verification failed:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }

  const eventType = evt.type;

  // ── User Created → Create Employee ──
  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!email) {
      console.error("[Webhook] user.created without email:", id);
      return new Response("No email found", { status: 400 });
    }

    const name = `${first_name ?? ""}`.trim();
    const surname = `${last_name ?? ""}`.trim();

    try {
      await db.employee.create({
        data: {
          clerkId: id,
          email,
          firstName: name || "New",
          lastName: surname || "User",
          avatarUrl: image_url ?? null,
          role: "EMPLOYEE", // default — admin promotes manually
          status: "ACTIVE",
        },
      });
      console.log(`[Webhook] Created employee for ${email} (${id})`);
    } catch (err) {
      // Handle duplicate — idempotent on retries
      if ((err as { code?: string }).code === "P2002") {
        console.log(`[Webhook] Employee already exists for ${id}, skipping`);
      } else {
        throw err;
      }
    }
  }

  // ── User Updated → Sync Fields ──
  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = email_addresses[0]?.email_address;

    try {
      await db.employee.update({
        where: { clerkId: id },
        data: {
          ...(email && { email }),
          ...(first_name !== undefined && { firstName: first_name ?? "" }),
          ...(last_name !== undefined && { lastName: last_name ?? "" }),
          ...(image_url !== undefined && { avatarUrl: image_url }),
        },
      });
      console.log(`[Webhook] Updated employee ${id}`);
    } catch (err) {
      // Employee might not exist yet if webhooks arrive out of order
      if ((err as { code?: string }).code === "P2025") {
        console.warn(`[Webhook] Employee not found for update: ${id}`);
      } else {
        throw err;
      }
    }
  }

  // ── User Deleted → Soft Delete ──
  if (eventType === "user.deleted") {
    const { id } = evt.data;

    try {
      await db.employee.update({
        where: { clerkId: id! },
        data: { status: "INACTIVE" },
      });
      console.log(`[Webhook] Deactivated employee ${id}`);
    } catch (err) {
      if ((err as { code?: string }).code === "P2025") {
        console.warn(`[Webhook] Employee not found for deletion: ${id}`);
      } else {
        throw err;
      }
    }
  }

  return new Response("OK", { status: 200 });
}
