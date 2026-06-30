import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
  useQuery,
} from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  AppState,
  type AppStateStatus,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { TRPCProvider, makeTRPCClient, useTRPC } from "./src/api/trpc";

// Bridge React Query's online status to the native network state (no browser
// online/offline events exist in React Native).
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

const queryClient = new QueryClient();
const trpcClient = makeTRPCClient();

export default function App() {
  // Refetch when the app returns to the foreground (replaces window focus).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (status: AppStateStatus) => {
      if (Platform.OS !== "web") {
        focusManager.setFocused(status === "active");
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <PlansScreen />
      </TRPCProvider>
    </QueryClientProvider>
  );
}

function PlansScreen() {
  const trpc = useTRPC();
  // Fully typed from @fitnest/api — same hooks you'd use on web.
  const plansQuery = useQuery(trpc.plans.list.queryOptions());

  return (
    <View style={styles.container}>
      {plansQuery.isPending ? (
        <Text>Loading plans…</Text>
      ) : plansQuery.error ? (
        <Text>Error: {plansQuery.error.message}</Text>
      ) : (
        plansQuery.data.map((plan) => (
          <Text key={plan.id}>
            {plan.name} — {plan.durationWeeks} weeks
          </Text>
        ))
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
