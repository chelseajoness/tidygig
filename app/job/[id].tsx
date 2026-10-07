import { useStripe } from "@stripe/stripe-react-native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Badge, Button, Card, colors, H1, Muted, Row, Screen } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { fmtDateTime, money } from "../../lib/format";
import { callPayments } from "../../lib/payments";
import { supabase } from "../../lib/supabase";
import { Job, JobStatus } from "../../lib/types";

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("jobs")
      .select("*, host:profiles!host_id(full_name, phone), cleaner:profiles!cleaner_id(full_name, phone)")
      .eq("id", id)
      .single();
    setJob(data as Job);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!job || !profile) return null;
  const isHost = profile.id === job.host_id;
  const other = isHost ? job.cleaner : job.host;
  const showPhone = ["accepted", "completed"].includes(job.status);

  const setStatus = async (status: JobStatus) => {
    setBusy(true);
    const { error } = await supabase.from("jobs").update({ status }).eq("id", job.id);
    setBusy(false);
    if (error) Alert.alert("Could not update", error.message);
    else load();
  };

  const confirmStatus = (status: JobStatus, label: string) =>
    Alert.alert(label, "Are you sure?", [
      { text: "No", style: "cancel" },
      { text: "Yes", onPress: () => setStatus(status) },
    ]);

  const pay = async () => {
    setBusy(true);
    try {
      const { client_secret } = await callPayments<{ client_secret: string }>({ action: "create_payment", job_id: job.id });
      const init = await initPaymentSheet({
        paymentIntentClientSecret: client_secret,
        merchantDisplayName: "TidyGig",
        returnURL: "tidygig://stripe-redirect",
      });
      if (init.error) throw new Error(init.error.message);
      const result = await presentPaymentSheet();
      if (result.error) {
        if (result.error.code !== "Canceled") throw new Error(result.error.message);
      } else {
        await callPayments({ action: "confirm_payment", job_id: job.id });
        await load();
      }
    } catch (e) {
      Alert.alert("Payment", (e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Screen>
      <H1>{job.title}</H1>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <Badge text={job.status.toUpperCase()} color={colors.primary} />
        {job.payment_status === "paid" && <Badge text="PAID" color="#2E9E5B" />}
      </View>

      <Card>
        <Row label="When" value={fmtDateTime(job.scheduled_at)} />
        <Row label="Duration" value={`${job.hours} h`} />
        <Row label="Address" value={job.address} />
        <Row label={isHost ? "Cleaner" : "Host"} value={other?.full_name ?? ""} />
        {showPhone && other?.phone ? <Row label="Phone" value={other.phone} /> : null}
        {job.notes ? <Text style={{ marginTop: 8, color: colors.text }}>{job.notes}</Text> : null}
      </Card>

      <Card>
        {isHost ? (
          <Row label="You pay" value={money(job.price_cents)} bold />
        ) : (
          <>
            <Row label="Cleaning price" value={money(job.price_cents)} />
            <Row label="Platform fee (5%)" value={`-${money(job.platform_fee_cents)}`} />
            <Row label="You earn" value={money(job.price_cents - job.platform_fee_cents)} bold />
          </>
        )}
      </Card>

      {!isHost && job.status === "requested" && (
        <>
          <Button title="Accept job" onPress={() => setStatus("accepted")} loading={busy} />
          <Button title="Decline" variant="danger" onPress={() => confirmStatus("declined", "Decline job")} />
        </>
      )}
      {!isHost && job.status === "accepted" && (
        <>
          <Button title="Mark cleaning completed" onPress={() => confirmStatus("completed", "Mark completed")} loading={busy} />
          <Button title="Cancel job" variant="danger" onPress={() => confirmStatus("cancelled", "Cancel job")} />
        </>
      )}
      {isHost && ["requested", "accepted"].includes(job.status) && (
        <Button title="Cancel booking" variant="danger" onPress={() => confirmStatus("cancelled", "Cancel booking")} />
      )}
      {isHost && job.status === "completed" && job.payment_status === "unpaid" && (
        <Button title={`Pay ${money(job.price_cents)}`} onPress={pay} loading={busy} />
      )}
      {!isHost && job.status === "completed" && job.payment_status === "unpaid" && (
        <Muted>Waiting for the host to pay. Payouts require completed payout setup in your profile.</Muted>
      )}
    </Screen>
  );
}
