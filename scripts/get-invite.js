require('dotenv').config({ path: '.env.local' });
const { clerkClient } = require('@clerk/nextjs/server');

async function main() {
  try {
    const client = await clerkClient();
    const invites = await client.invitations.getInvitationList();
    console.log("Found Invitations:", invites.totalCount);
    
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
