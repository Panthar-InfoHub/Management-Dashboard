// Errors that are safe to show people.
//
// Next.js hides every server error message in production, and in development it
// shows raw ones (Prisma, Clerk…). We want neither: messages written for people
// should reach them, everything else should read as a plain "try again".
//
// `UserError` carries its message in `digest`, which Next.js passes to the
// browser unchanged. Anything else falls back to the caller's generic message.
// Client-safe: no server imports.

const PREFIX = "user:";

export class UserError extends Error {
  readonly digest: string;
  constructor(message: string) {
    super(message);
    this.name = "UserError";
    this.digest = PREFIX + message;
  }
}

export const GENERIC_ERROR = "Something went wrong. Try again.";

/** The message written for people, or null when the error is internal. */
export function publicMessage(err: unknown): string | null {
  if (err instanceof UserError) return err.message;
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith(PREFIX) ? digest.slice(PREFIX.length) : null;
}

/** Message to show for a failed action: the safe message, or `fallback`. */
export function errorMessage(err: unknown, fallback: string = GENERIC_ERROR): string {
  return publicMessage(err) ?? fallback;
}
