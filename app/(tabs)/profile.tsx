import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { Button, Card, H1, Input, Muted, Screen } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { getCurrentPlace } from "../../lib/location";
import { callPayments } from "../../lib/payments";
import { supabase } from "../../lib/supabase";

export default function ProfileScreen() {
  const { profile, session, refreshProfile } = useAuth();
  const isCleaner = profile?.role === "cleaner";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [rate, setRate] = useState("");
  const [radius, setRadius] = useState("15");
  const [place, setPlace] = useState<{ lat: number | null; lng: number | null; city: string | null }>({
    lat: null,
    lng: null,
    city: null,
  });
  const [payoutsEnabled, setPayoutsEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name);
    setPhone(profile.phone ?? "");
    setBio(profile.bio ?? "");
    setRate(profile.hourly_rate_cents ? String(profile.hourly_rate_cents / 100) : "");
    setRadius(String(profile.radius_miles));
    setPlace({ lat: profile.lat, lng: profile.lng, city: profile.city });
  }, [profile]);

  useEffect(() => {
    if (isCleaner) callPayments<{ enabled: boolean }>({ action: "payout_status" }).then((r) => setPayoutsEnabled(r.enabled)).catch(() => setPayoutsEnabled(false));
  }, [isCleaner]);

  const useMyLocation = async () => {
    try {
      setPlace(await getCurrentPlace());
    } catch (e) {
      Alert.alert("Location", (e as Error).message);
    }
  };

  const save = async () => {
    if (!profile) return;
    const rateNum = parseFloat(rate);
    if (isCleaner && (!rateNum || rateNum <= 0)) {
      Alert.alert("Hourly rate", "Enter your hourly rate in dollars.");
      return;
    }
    const radiusNum = parseInt(radius, 10);
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        ...place,
        ...(isCleaner
          ? { hourly_rate_cents: Math.round(rateNum * 100), radius_miles: Math.min(200, Math.max(1, radiusNum || 15)) }
          : {}),
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) Alert.alert("Could not save", error.message);
    else {
      await refreshProfile();
      Alert.alert("Saved");
    }
  };

  const setupPayouts = async () => {
    try {
      const { url } = await callPayments<{ url: string }>({ action: "onboard" });
      await WebBrowser.openAuthSessionAsync(url, "tidygig://payouts");
      const r = await callPayments<{ enabled: boolean }>({ action: "payout_status" });
      setPayoutsEnabled(r.enabled);
    } catch (e) {
      Alert.alert("Payout setup", (e as Error).message);
    }
  };

  return (
    <Screen>
      <H1>{isCleaner ? "Cleaner profile" : "Host profile"}</H1>
      <Muted style={{ marginBottom: 16 }}>{session?.user.email}</Muted>

      <Input label="Full name" value={name} onChangeText={setName} />
      <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input label={isCleaner ? "About you & experience" : "About your properties"} value={bio} onChangeText={setBio} multiline />

      <Card>
        <Muted>Location: {place.city ?? (place.lat ? "Saved" : "Not set")}</Muted>
        <Button title="Use my current location" variant="secondary" onPress={useMyLocation} />
      </Card>

      {isCleaner && (
        <>
          <Input label="Hourly rate (USD)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
          <Input label="Service radius (miles)" value={radius} onChangeText={setRadius} keyboardType="number-pad" />
        </>
      )}

      <Button title="Save profile" onPress={save} loading={busy} />

      {isCleaner && (
        <Card style={{ marginTop: 20 }}>
          <Muted>Payouts: {payoutsEnabled ? "Ready - you will be paid 95% of each job" : "Not set up"}</Muted>
          {!payoutsEnabled && <Button title="Set up payouts with Stripe" onPress={setupPayouts} />}
        </Card>
      )}

      <View style={{ marginTop: 12 }}>
        <Button title="Sign out" variant="danger" onPress={() => supabase.auth.signOut()} />
      </View>
    </Screen>
  );
}
