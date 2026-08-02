// Public entry consumed by clients. Clients import only `type AppRouter`
// (type-only), so none of the server/runtime code below ships to their bundles.

export type { AppRouter } from "./router.js";
export { appRouter } from "./router.js";
