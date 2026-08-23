import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createStart } from "@tanstack/react-start";

/**
 * Registers Clerk's request middleware globally, which is what makes the
 * `auth()` server helper resolvable inside server functions (see
 * routes/_shell.tsx's guard). Without it `auth()` throws at request time.
 */
export const startInstance = createStart(() => ({
  requestMiddleware: [clerkMiddleware()],
}));
