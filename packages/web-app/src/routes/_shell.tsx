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
  // Mirrors the API's per-request dev bypass (ADR 0009): the seed Playwright
  // suite sets this cookie and asserts against the fixture user, while the auth
  // suite never sets it and so sees a genuinely signed-out visitor.
  if (import.meta.env.DEV && getCookie(DEV_USER_COOKIE) === "1") {
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
