// ── Next.js 16 Proxy (formerly middleware.ts) ──
// Protected-first strategy: everything requires auth EXCEPT public routes.
// This is the gatekeeper — all route protection happens here.

import { clerkMiddleware } from "@clerk/nextjs/server";

// Segment-bounded checks — a plain startsWith("/sign-in") would also match an
// unintended future route like /sign-in-anything. Note: this middleware is a
// UX convenience (redirect unauthenticated users early), not the real security
// boundary — every page/action independently enforces auth via getCurrentEmployee().
function isPublicPath(path: string): boolean {
  return (
    path === "/sign-in" || path.startsWith("/sign-in/") ||
    path === "/sign-up" || path.startsWith("/sign-up/") ||
    path === "/api/webhooks" || path.startsWith("/api/webhooks/") ||
    path === "/manifest.json"
  );
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublicPath(req.nextUrl.pathname)) {
    return;
  }

  await auth.protect();
});

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
