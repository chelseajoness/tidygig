// Deploy with: supabase functions deploy payments --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are provided).
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const FEE_RATE = 0.05;

const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function encode(obj: Record<string, unknown>, prefix = ""): [string, string][] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}[${k}]` : k;
    return typeof v === "object" && v !== null
      ? encode(v as Record<string, unknown>, key)
      : [[key, String(v)] as [string, string]];
  });
}

async function stripe(method: "GET" | "POST", path: string, params: Record<string, unknown> = {}) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "POST" ? new URLSearchParams(encode(params)).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Stripe error");
  return json;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Stripe onboarding return/refresh target: bounce back into the app.
  if (req.method === "GET") {
    return new Response(null, { status: 302, headers: { Location: "tidygig://payouts" } });
  }

  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: auth } = await admin.auth.getUser(token);
    const user = auth.user;
    if (!user) return json({ error: "Not signed in" }, 401);

    const body = await req.json();

    if (body.action === "onboard") {
      const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "cleaner") return json({ error: "Only cleaners can receive payouts" }, 403);

      const { data: existing } = await admin
        .from("cleaner_payout_accounts").select("stripe_account_id").eq("cleaner_id", user.id).maybeSingle();
      let accountId = existing?.stripe_account_id as string | undefined;
      if (!accountId) {
        const account = await stripe("POST", "accounts", {
          type: "express",
          email: user.email,
          capabilities: { transfers: { requested: true } },
          metadata: { user_id: user.id },
        });
        accountId = account.id as string;
        await admin.from("cleaner_payout_accounts").insert({ cleaner_id: user.id, stripe_account_id: accountId });
      }
      const returnUrl = `${url.origin}${url.pathname}`;
      const link = await stripe("POST", "account_links", {
        account: accountId,
        type: "account_onboarding",
        return_url: returnUrl,
        refresh_url: returnUrl,
      });
      return json({ url: link.url });
    }

    if (body.action === "payout_status") {
      const { data: row } = await admin
        .from("cleaner_payout_accounts").select("stripe_account_id").eq("cleaner_id", user.id).maybeSingle();
      if (!row) return json({ enabled: false });
      const account = await stripe("GET", `accounts/${row.stripe_account_id}`);
      const enabled = Boolean(account.details_submitted && account.payouts_enabled);
      await admin.from("cleaner_payout_accounts").update({ payouts_enabled: enabled }).eq("cleaner_id", user.id);
      return json({ enabled });
    }

    if (body.action === "create_payment") {
      const { data: job } = await admin.from("jobs").select("*").eq("id", body.job_id).single();
      if (!job || job.host_id !== user.id) return json({ error: "Job not found" }, 404);
      if (job.status !== "completed" || job.payment_status !== "unpaid") {
        return json({ error: "Job is not ready for payment" }, 400);
      }
      const { data: payout } = await admin
        .from("cleaner_payout_accounts").select("*").eq("cleaner_id", job.cleaner_id).maybeSingle();
      if (!payout?.payouts_enabled) return json({ error: "Cleaner has not finished payout setup yet" }, 400);

      const intent = await stripe("POST", "payment_intents", {
        amount: job.price_cents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        application_fee_amount: Math.round(job.price_cents * FEE_RATE),
        transfer_data: { destination: payout.stripe_account_id },
        metadata: { job_id: job.id },
      });
      await admin.from("jobs").update({ payment_intent_id: intent.id }).eq("id", job.id);
      return json({ client_secret: intent.client_secret });
    }

    if (body.action === "confirm_payment") {
      const { data: job } = await admin.from("jobs").select("*").eq("id", body.job_id).single();
      if (!job || job.host_id !== user.id || !job.payment_intent_id) return json({ error: "Job not found" }, 404);
      const intent = await stripe("GET", `payment_intents/${job.payment_intent_id}`);
      if (intent.status !== "succeeded") return json({ paid: false });
      await admin.from("jobs")
        .update({ payment_status: "paid", paid_at: new Date().toISOString() }).eq("id", job.id);
      return json({ paid: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
