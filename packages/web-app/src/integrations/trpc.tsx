import type { AppRouter } from "@fitnest/api";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";

// `AppRouter` is a type-only import — no server code is bundled into the client.
export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

export function makeTRPCClient() {
  const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl}/trpc`,
        // Auth header goes here once tokens are wired up, e.g.
        // headers: () => ({ authorization: `Bearer ${getToken()}` }),
      }),
    ],
  });
}
