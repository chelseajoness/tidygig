import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Button, Card, colors, Muted, Screen, Stepper, Toggle } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { DAYS, fmtHour } from "../../lib/format";
import { supabase } from "../../lib/supabase";

type Slot = { enabled: boolean; start: number; end: number };
const DEFAULT_SLOT: Slot = { enabled: false, start: 9, end: 17 };

export default function Availability() {
  const { profile } = useAuth();
  const [slots, setSlots] = useState<Slot[]>(DAYS.map(() => ({ ...DEFAULT_SLOT })));
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      supabase
        .from("availability")
        .select("weekday, start_hour, end_hour")
        .eq("cleaner_id", profile.id)
        .then(({ data }) => {
          const next = DAYS.map(() => ({ ...DEFAULT_SLOT }));
          data?.forEach((a) => {
            next[a.weekday] = { enabled: true, start: a.start_hour, end: a.end_hour };
          });
          setSlots(next);
        });
    }, [profile])
  );

  const update = (i: number, patch: Partial<Slot>) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const save = async () => {
    if (!profile) return;
    setBusy(true);
    const rows = slots
      .map((s, weekday) => ({ cleaner_id: profile.id, weekday, start_hour: s.start, end_hour: s.end, enabled: s.enabled }))
      .filter((r) => r.enabled)
      .map(({ enabled: _e, ...r }) => r);
    const del = await supabase.from("availability").delete().eq("cleaner_id", profile.id);
    const ins = rows.length ? await supabase.from("availability").insert(rows) : { error: null };
    setBusy(false);
    const error = del.error ?? ins.error;
    Alert.alert(error ? "Could not save" : "Saved", error ? error.message : "Your availability is up to date.");
  };

  return (
    <Screen>
      <Muted style={{ marginBottom: 12 }}>
        Choose the days and hours you are open to gig cleaning work. Hosts only see you on days you enable.
      </Muted>
      {slots.map((s, i) => (
        <Card key={DAYS[i]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{DAYS[i]}</Text>
            <Toggle
              value={s.enabled}
              onValueChange={(v) => update(i, { enabled: v })}
              trackColor={{ true: colors.primary }}
            />
          </View>
          {s.enabled && (
            <View style={{ marginTop: 10, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Muted>From</Muted>
                <Stepper value={s.start} min={0} max={s.end - 1} format={fmtHour} onChange={(v) => update(i, { start: v })} />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Muted>Until</Muted>
                <Stepper value={s.end} min={s.start + 1} max={24} format={fmtHour} onChange={(v) => update(i, { end: v })} />
              </View>
            </View>
          )}
        </Card>
      ))}
      <Button title="Save availability" onPress={save} loading={busy} />
    </Screen>
  );
}
