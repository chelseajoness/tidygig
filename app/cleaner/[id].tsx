import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text } from "react-native";
import { DateTimeField } from "../../components/DateTimeField";
import { Button, Card, colors, H1, Input, Label, Muted, Row, Screen, Stepper } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { calcFee, DAYS, fmtHour, money } from "../../lib/format";
import { supabase } from "../../lib/supabase";
import { Availability, Profile } from "../../lib/types";

export default function CleanerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile: me } = useAuth();
  const router = useRouter();
  const [cleaner, setCleaner] = useState<Profile | null>(null);
  const [avail, setAvail] = useState<Availability[]>([]);
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [hours, setHours] = useState(2);
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    d.setMinutes(0, 0, 0);
    return d;
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", id).single().then(({ data }) => setCleaner(data as Profile));
    supabase.from("availability").select("weekday, start_hour, end_hour").eq("cleaner_id", id)
      .order("weekday").then(({ data }) => setAvail((data as Availability[]) ?? []));
  }, [id]);

  if (!cleaner) return null;
  const price = Math.round((cleaner.hourly_rate_cents ?? 0) * hours);

  const fitsAvailability = () => {
    const slot = avail.find((a) => a.weekday === when.getDay());
    const startH = when.getHours() + when.getMinutes() / 60;
    return !!slot && startH >= slot.start_hour && startH + hours <= slot.end_hour;
  };

  const book = async () => {
    if (!title.trim() || !address.trim()) {
      Alert.alert("Missing info", "Add a property name and address.");
      return;
    }
    if (!fitsAvailability()) {
      Alert.alert("Outside availability", `${cleaner.full_name} is not available for that day and time. Pick a time within their listed hours.`);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        host_id: me!.id,
        cleaner_id: cleaner.id,
        title: title.trim(),
        address: address.trim(),
        notes: notes.trim() || null,
        scheduled_at: when.toISOString(),
        hours,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) Alert.alert("Could not book", error.message);
    else router.replace(`/job/${data.id}`);
  };

  return (
    <Screen>
      <H1>{cleaner.full_name}</H1>
      <Muted>{cleaner.city} · {money(cleaner.hourly_rate_cents ?? 0)}/hr</Muted>
      {cleaner.bio ? <Text style={{ marginVertical: 10, color: colors.text }}>{cleaner.bio}</Text> : null}

      <Card style={{ marginTop: 12 }}>
        <Label>Weekly availability</Label>
        {avail.length === 0 && <Muted>No availability listed.</Muted>}
        {avail.map((a) => (
          <Row key={a.weekday} label={DAYS[a.weekday]} value={`${fmtHour(a.start_hour)} - ${fmtHour(a.end_hour)}`} />
        ))}
      </Card>

      {me?.role === "host" && (
        <>
          <Input label="Property name" value={title} onChangeText={setTitle} placeholder="Beach house turnover" />
          <Input label="Address" value={address} onChangeText={setAddress} />
          <DateTimeField label="Start time" value={when} onChange={setWhen} />
          <Label>Estimated hours</Label>
          <Stepper value={hours} min={1} max={12} step={0.5} onChange={setHours} format={(v) => `${v} h`} />
          <Input label="Notes (door codes, linens, etc.)" value={notes} onChangeText={setNotes} multiline style={{ marginTop: 12 }} />

          <Card style={{ marginTop: 8 }}>
            <Row label="Cleaning price" value={money(price)} bold />
            <Row label="Platform fee (5%, paid from cleaner's earnings)" value={money(calcFee(price))} />
            <Row label="Cleaner receives" value={money(price - calcFee(price))} />
          </Card>
          <Button title="Request booking" onPress={book} loading={busy} />
          <Muted style={{ marginTop: 8 }}>You are charged only after the cleaning is completed.</Muted>
        </>
      )}
    </Screen>
  );
}
