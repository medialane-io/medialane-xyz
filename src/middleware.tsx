import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  '/',
  '/docs(.*)',
  '/mint(.*)',       // events — public
  '/workshop',      // educational — public
  '/onboarding',    // wallet setup
  '/api/proxy(.*)', // existing proxy
]);

// Paths that don't require a Chipi wallet (API portal is wallet-free)
const isPortalPath = createRouteMatcher([
  '/api/portal(.*)',
]);

/**
 * Read walletCreated from the JWT session claims — zero Clerk API calls.
 *
 * Requires a custom session token in the Clerk dashboard:
 *   Dashboard → Sessions → Customize session token → add:
 *   { "metadata": "{{user.public_metadata}}" }
 *
 * Once configured, sessionClaims.metadata.walletCreated reflects the value
 * set in publicMetadata and is refreshed on every new session token issue.
 */
function hasWalletClaim(sessionClaims: Record<string, unknown> | null): boolean {
  const metadata = sessionClaims?.metadata as Record<string, unknown> | undefined;
  return metadata?.walletCreated === true;
}

export default clerkMiddleware(async (_auth, _req) => {
  // All routes are public — no forced sign-in or onboarding redirects.
  // Auth is opt-in: pages that need it call auth() directly.
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
