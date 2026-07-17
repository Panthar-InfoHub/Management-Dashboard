import { createClerkClient } from "@clerk/backend";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  try {
    const client = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
    const invites = await client.invitations.getInvitationList();
    console.log(`Found Invitations: ${invites.totalCount}`);
    
    for (const inv of invites.data) {
      console.log(`\nEmail: ${inv.emailAddress}`);
      console.log(`Status: ${inv.status}`);
      console.log(`Link: ${inv.url}`);
    }
  } catch (error) {
    console.error("Error fetching invitations:", error);
  }
}

main();
