/**
 * Clerk's signals API returns errors rather than throwing them. `longMessage` is
 * the user-facing prose ("Password has been found in an online data breach");
 * `message` is aimed at developers, so it's only a fallback.
 *
 * Typed structurally: the concrete `ClerkError` class lives in @clerk/shared and
 * isn't re-exported from the TanStack Start entrypoint.
 */
type ClerkErrorLike = { message?: string; longMessage?: string };

export function clerkErrorMessage(error: ClerkErrorLike | null | undefined): string | null {
  if (!error) return null;
  return error.longMessage ?? error.message ?? "Something went wrong. Please try again.";
}
