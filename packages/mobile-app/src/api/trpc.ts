import type { AppRouter } from "@fitnest/api";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// `AppRouter` is a type-only import — nothing from the server bundles into the app.
export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

function getBaseUrl(): string {
  // Baked into the binary at build time. Changing it requires a rebuild.
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) {
    return fromEnv;
  }

  // Dev fallback: a device/emulator can't reach the host machine via "localhost".
  // Android emulator maps the host loopback to 10.0.2.2; the iOS simulator shares
  // the host network. A physical device needs your machine's LAN IP via the env var.
  const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  return `http://${host}:4000`;
}

export function makeTRPCClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/trpc`,
        async headers() {
          const token = await SecureStore.getItemAsync("authToken");
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
