import { getToken } from "@clerk/tanstack-react-start";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { makeTRPCClient, TRPCProvider } from "./integrations/trpc";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = new QueryClient();
  // Clerk's `getToken` waits for Clerk to initialize and throws outside the
  // browser. No route has a loader — all tRPC calls happen in components via
  // useQuery — so this never runs during SSR, but the guard keeps that
  // assumption from failing silently if a loader is added later.
  const trpcClient = makeTRPCClient(async () =>
    typeof window === "undefined" ? null : await getToken(),
  );

  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
          {children}
        </TRPCProvider>
      </QueryClientProvider>
    ),
  });

  // Dehydrate/hydrate the same QueryClient across SSR (provider supplied above).
  setupRouterSsrQueryIntegration({
    router,
    queryClient,
    wrapQueryClient: false,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
