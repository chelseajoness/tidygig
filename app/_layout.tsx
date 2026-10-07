import { StripeProvider } from "@stripe/stripe-react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { colors } from "../components/ui";
import { AuthProvider, useAuth } from "../lib/auth";

function Gate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!session && !inAuth) router.replace("/(auth)/login");
    else if (session && inAuth) router.replace("/(tabs)");
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerTintColor: colors.primary }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="cleaner/[id]" options={{ title: "Book a cleaner" }} />
      <Stack.Screen name="job/[id]" options={{ title: "Cleaning job" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
      urlScheme="tidygig"
    >
      <AuthProvider>
        <StatusBar style="dark" />
        <Gate />
      </AuthProvider>
    </StripeProvider>
  );
}
