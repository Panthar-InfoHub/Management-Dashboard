// Clerk (sign-in) is shared between the demo and production databases. With
// DISABLE_CLERK_WRITES=1 (local/demo), actions skip every Clerk change —
// invites, account deletion, metadata — and only change the database, so
// testing can never lock a real person out of production.
export const CLERK_WRITES_ENABLED = process.env.DISABLE_CLERK_WRITES !== "1";
