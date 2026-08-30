import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { Sidebar } from "../ui/Sidebar";

/** Kept in sync with the API's `DEV_USER_COOKIE`. */
const DEV_USER_COOKIE = "fitnest_dev_user";

/**
 * Resolved on the server during SSR so an unauthenticated visitor is redirected
 * before any protected markup is rendered or any query fires.
 */
const fetchAuthState = createServerFn({ method: "GET" }).handler(async () => {
  // Mirrors the API's per-request dev bypass (ADR 0009), down to the env flag:
  // DEV_AUTH_BYPASS grants the capability, and a request claims it by carrying
  // this cookie. The seed Playwright suite sets it and asserts against the
  // fixture user; the auth suite never sets it and so sees a genuinely
  // signed-out visitor. Read from process.env at request time rather than
  // `import.meta.env.DEV`, which Vite folds to false at build time and so
  // cannot be honoured by the compiled server the e2e suite now runs against.
  // Never set this in a real deploy config.
  if (process.env.DEV_AUTH_BYPASS === "true" && getCookie(DEV_USER_COOKIE) === "1") {
    return { userId: "dev-bypass" };
  }

  const { userId } = await auth();
  return { userId };
});

export const Route = createFileRoute("/_shell")({
  // One guard on the pathless layout covers every app route by construction, so
  // a new route under _shell can't accidentally ship unprotected.
  beforeLoad: async ({ location }) => {
    const { userId } = await fetchAuthState();
    if (!userId) {
      throw redirect({
        to: "/sign-in",
        // Preserve the attempted destination so a deep link survives login.
        search: { redirect: location.href },
      });
    }
    return { userId };
  },
  component: ShellLayout,
});

function ShellLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
