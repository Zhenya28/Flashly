import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import "../global.css";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/Colors";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useThemeStore } from "@/store/themeStore";
import { useTheme } from "@/hooks/useTheme";

import {
  useFonts,
  Montserrat_700Bold,
  Montserrat_600SemiBold,
} from '@expo-google-fonts/montserrat';
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
  SourceSans3_500Medium,
} from '@expo-google-fonts/source-sans-3';

const queryClient = new QueryClient();

export default function RootLayout() {
  const { isAuthenticated, isLoading: isAuthLoading, checkAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTheme();
  const hydrateTheme = useThemeStore(s => s.hydrate);

  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Montserrat_600SemiBold,
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    SourceSans3_500Medium,
  });

  useEffect(() => {
    hydrateTheme();
    checkAuth();

    // Initialize notifications (wrapped in try-catch for Expo Go compatibility)
    const initNotifications = async () => {
      try {
        const { NotificationService } = await import("@/services/notifications");
        const { ProfileService } = await import("@/services/profile");
        // No native push token registration needed for local notifications
        await NotificationService.registerForPushNotificationsAsync();

        // Schedule based on saved settings (default 09:00)
        const settings = await ProfileService.getUserSettings();
        if (settings.notificationTime) {
          const [hours, minutes] = settings.notificationTime.split(':').map(Number);
          await NotificationService.scheduleDailyReminder(hours, minutes);
        } else {
            await NotificationService.cancelAll();
        }
      } catch (error) {
        console.warn("Notifications not available:", error);
      }
    };

    initNotifications();
  }, []);

  useEffect(() => {
    if (isAuthLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (isAuthenticated && inAuthGroup) {
      // Redirect to home if user is signed in
      router.replace("/(tabs)");
    } else if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if user is not signed in
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, isAuthLoading, segments, fontsLoaded]);

  if (isAuthLoading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />

          {/* Collection & Card screens - Explicit config for Modals */}
          <Stack.Screen name="collections/create" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="collections/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="cards/create" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="cards/generate" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="study/[id]" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="quiz/[id]" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
