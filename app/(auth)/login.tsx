import { useState } from "react";
import { Alert, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Chip, H1, Input, Label, Muted, Screen } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { Role } from "../../lib/types";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<Role>("host");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 6 || (mode === "signup" && !name.trim())) {
      Alert.alert("Missing info", "Enter your name (sign up), email and a password of 6+ characters.");
      return;
    }
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) Alert.alert("Sign in failed", error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { role, full_name: name.trim() } },
      });
      if (error) Alert.alert("Sign up failed", error.message);
      else if (!data.session) Alert.alert("Check your email", "Confirm your email address, then sign in.");
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Screen>
        <View style={{ marginTop: 40, marginBottom: 24 }}>
          <H1>TidyGig</H1>
          <Muted>Find trusted gig cleaners for your short-term rental turnovers.</Muted>
        </View>

        {mode === "signup" && (
          <>
            <Label>I am a...</Label>
            <View style={{ flexDirection: "row", marginBottom: 14 }}>
              <Chip label="Airbnb co-host" selected={role === "host"} onPress={() => setRole("host")} />
              <Chip label="Cleaner" selected={role === "cleaner"} onPress={() => setRole("cleaner")} />
            </View>
            <Input label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
          </>
        )}
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />

        <Button title={mode === "signin" ? "Sign in" : "Create account"} onPress={submit} loading={busy} />
        <Button
          title={mode === "signin" ? "New here? Create an account" : "Have an account? Sign in"}
          variant="secondary"
          onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
        />
      </Screen>
    </SafeAreaView>
  );
}
