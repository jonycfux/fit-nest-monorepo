import { createClerkClient } from "@clerk/backend";
import { env } from "../env.js";

/**
 * Clerk is the identity provider; this client is used for exactly two things:
 * verifying session tokens on every request, and reading a user's profile once
 * at provision time (ADR 0009). It is not a general-purpose user store — the
 * `users` table owns everything the domain cares about.
 */
export const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

/**
 * The name of the cookie/header pair that opts a request into the dev-user
 * bypass. The web app reads the cookie (same-origin) and forwards it to this
 * API as a header, because the tRPC client deliberately does not send
 * credentials cross-origin (ADR 0009).
 */
export const DEV_USER_HEADER = "x-dev-user";
export const DEV_USER_COOKIE = "fitnest_dev_user";
