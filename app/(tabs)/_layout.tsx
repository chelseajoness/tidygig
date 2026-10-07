import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "../../components/ui";
import { useAuth } from "../../lib/auth";

export default function TabsLayout() {
  const { profile } = useAuth();
  const isHost = profile?.role !== "cleaner";

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerTitleStyle: { fontWeight: "700" } }}>
      <Tabs.Screen
        name="index"
        options={{
          title: isHost ? "Find cleaners" : "My jobs",
          tabBarIcon: ({ color, size }) => <Ionicons name={isHost ? "search" : "briefcase"} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          href: isHost ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          title: "Availability",
          href: isHost ? null : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
