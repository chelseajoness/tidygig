import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Button, Card, Chip, colors, Muted, Screen } from "../../components/ui";
import JobList from "../../components/JobList";
import { useAuth } from "../../lib/auth";
import { DAYS, money } from "../../lib/format";
import { getCurrentPlace } from "../../lib/location";
import { supabase } from "../../lib/supabase";
import { NearbyCleaner } from "../../lib/types";

function FindCleaners() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [weekday, setWeekday] = useState<number | null>(null);
  const [results, setResults] = useState<NearbyCleaner[] | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async (day: number | null = weekday) => {
    setBusy(true);
    try {
      let lat = profile?.lat;
      let lng = profile?.lng;
      if (lat == null || lng == null) {
        const place = await getCurrentPlace();
        lat = place.lat;
        lng = place.lng;
        await supabase.from("profiles").update(place).eq("id", profile!.id);
        await refreshProfile();
      }
      const { data, error } = await supabase.rpc("nearby_cleaners", {
        p_lat: lat,
        p_lng: lng,
        p_weekday: day,
      });
      if (error) throw error;
      setResults(data as NearbyCleaner[]);
    } catch (e) {
      Alert.alert("Search failed", (e as Error).message);
    }
    setBusy(false);
  };

  const pickDay = (day: number | null) => {
    setWeekday(day);
    search(day);
  };

  return (
    <Screen>
      <Muted>Cleaners near {profile?.city ?? "your location"} who serve your area.</Muted>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12, flexGrow: 0 }}>
        <Chip label="Any day" selected={weekday === null} onPress={() => pickDay(null)} />
        {DAYS.map((d, i) => (
          <Chip key={d} label={d.slice(0, 3)} selected={weekday === i} onPress={() => pickDay(i)} />
        ))}
      </ScrollView>
      <Button title={results ? "Refresh results" : "Search near me"} onPress={() => search()} loading={busy} />

      <View style={{ marginTop: 16 }}>
        {results?.length === 0 && <Muted>No cleaners available in your area yet.</Muted>}
        {results?.map((c) => (
          <Card key={c.id} onPress={() => router.push(`/cleaner/${c.id}`)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>{c.full_name}</Text>
              <Text style={{ fontWeight: "700", color: colors.primary }}>{money(c.hourly_rate_cents ?? 0)}/hr</Text>
            </View>
            <Muted>
              {c.city ?? "Nearby"} · {c.distance_miles.toFixed(1)} mi away
            </Muted>
            {c.bio ? <Text style={{ marginTop: 6, color: colors.text }} numberOfLines={2}>{c.bio}</Text> : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}

export default function Home() {
  const { profile } = useAuth();
  if (!profile) return null;
  return profile.role === "host" ? <FindCleaners /> : <JobList />;
}
