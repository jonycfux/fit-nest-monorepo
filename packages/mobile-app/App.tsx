import "./global.css";
import { buttonTextVariants, buttonVariants } from "@fitnest/shared";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
  useQuery,
} from "@tanstack/react-query";
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
} from "@expo-google-fonts/barlow";
import {
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from "@expo-google-fonts/barlow-condensed";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  AppState,
  type AppStateStatus,
  Platform,
  Pressable,
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

SplashScreen.preventAutoHideAsync();

export default function App() {
  // "Storefront Slate" brand fonts — Barlow Condensed (chrome/headings) + Barlow
  // (body). Splash screen stays up until these are ready so no system-font flash.
  const [fontsLoaded] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BarlowCondensed_500Medium,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Refetch when the app returns to the foreground (replaces window focus).
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (status: AppStateStatus) => {
        if (Platform.OS !== "web") {
          focusManager.setFocused(status === "active");
        }
      },
    );
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

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
    <View className="flex-1 items-center justify-center gap-4 bg-background">
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

      {/* Same shared variant call as the web app. */}
      <Pressable className={buttonVariants({ variant: "primary" })}>
        <Text className={buttonTextVariants({ variant: "primary" })}>
          Add plan
        </Text>
      </Pressable>

      <StatusBar style="auto" />
    </View>
  );
}
