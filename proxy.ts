// ── Next.js 16 Proxy (formerly middleware.ts) ──
// Protected-first strategy: everything requires auth EXCEPT public routes.
// This is the gatekeeper — all route protection happens here.

import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;
  
  // Public routes that don't need protection
  if (path.startsWith("/sign-in") || path.startsWith("/sign-up") || path.startsWith("/api/webhooks")) {
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
