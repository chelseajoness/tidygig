import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Badge, Card, colors, Muted } from "./ui";
import { useAuth } from "../lib/auth";
import { fmtDateTime, money } from "../lib/format";
import { supabase } from "../lib/supabase";
import { Job } from "../lib/types";

const STATUS_COLOR: Record<string, string> = {
  requested: colors.warn,
  accepted: colors.primary,
  completed: "#3A6FD8",
  declined: colors.danger,
  cancelled: colors.muted,
};

export default function JobList() {
  const { profile } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isHost = profile?.role === "host";

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("jobs")
      .select("*, host:profiles!host_id(full_name, phone), cleaner:profiles!cleaner_id(full_name, phone)")
      .order("scheduled_at", { ascending: false });
    setJobs((data as Job[]) ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {jobs?.length === 0 && (
        <Muted>{isHost ? "No bookings yet. Find a cleaner to get started." : "No jobs yet. Set your availability so hosts can book you."}</Muted>
      )}
      {jobs?.map((j) => (
        <Card key={j.id} onPress={() => router.push(`/job/${j.id}`)}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, flex: 1 }}>{j.title}</Text>
            <Badge text={j.status.toUpperCase()} color={STATUS_COLOR[j.status]} />
          </View>
          <Muted>{fmtDateTime(j.scheduled_at)} · {j.hours}h</Muted>
          <Muted>{isHost ? `Cleaner: ${j.cleaner?.full_name}` : `Host: ${j.host?.full_name}`}</Muted>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
            <Text style={{ fontWeight: "700", color: colors.text }}>
              {money(isHost ? j.price_cents : j.price_cents - j.platform_fee_cents)}
            </Text>
            {j.payment_status === "paid" && <Badge text="PAID" color="#2E9E5B" />}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
