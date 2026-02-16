import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { StorageProvider } from "@/lib/storage-context";
import { SessionProvider, useSession } from "@/lib/session-context";
import { useFonts, NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold, NunitoSans_800ExtraBold } from "@expo-google-fonts/nunito-sans";
import { SUSE_400Regular } from "@expo-google-fonts/suse";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { session, isLoading, isAuthenticated } = useSession();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inLogin = segments[0] === "login";
    const inTabs = segments[0] === "(tabs)";
    const inLobby = segments[0] === "lobby";
    const inOnboarding = segments[0] === "onboarding";

    if (!isAuthenticated) {
      // Not signed in → must go to /login
      if (!inLogin) {
        router.replace("/login");
      }
    } else if (!session.couple) {
      // Signed in but no couple → onboarding (set name + create/join room)
      if (!inOnboarding) {
        router.replace("/onboarding");
      }
    } else if (session.couple.status === "waiting") {
      // Waiting for partner
      if (!inLobby) {
        router.replace("/lobby");
      }
    } else if (session.couple.status === "ready") {
      // Ready → main app
      if (!inTabs) {
        router.replace("/(tabs)");
      }
    }
  }, [session, isLoading, isAuthenticated, segments]);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="lobby" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
    SUSE_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <StorageProvider>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </StorageProvider>
        </SessionProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
