import type { AppRouter } from "@fitnest/api";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";

// `AppRouter` is a type-only import — no server code is bundled into the client.
export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

/** Kept in sync with the API's `DEV_USER_COOKIE` / `DEV_USER_HEADER`. */
const DEV_USER_COOKIE = "fitnest_dev_user";
const DEV_USER_HEADER = "x-dev-user";

function hasDevUserCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").includes(`${DEV_USER_COOKIE}=1`);
}

/**
 * @param getToken Resolves the current Clerk session token, or null when signed
 * out. Passed in rather than imported so this stays usable outside a React tree.
 */
export function makeTRPCClient(getToken?: () => Promise<string | null>) {
  const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        headers: async () => {
          const headers: Record<string, string> = {};

          // The dev cookie is same-origin to the web app; the API is not, and
          // this client deliberately doesn't send credentials cross-origin
          // (ADR 0009). Translate cookie presence into a header the API reads.
          if (hasDevUserCookie()) headers[DEV_USER_HEADER] = "1";

          const token = await getToken?.();
          if (token) headers.authorization = `Bearer ${token}`;

          return headers;
        },
      }),
    ],
  });
}
