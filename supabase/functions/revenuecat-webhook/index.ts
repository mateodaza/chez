/**
 * RevenueCat Webhook Handler
 *
 * Processes subscription events from RevenueCat and syncs tier changes
 * to the user_rate_limits table.
 *
 * Webhook URL: https://<project>.supabase.co/functions/v1/revenuecat-webhook
 *
 * Configure in RevenueCat Dashboard:
 * 1. Go to Project Settings > Integrations > Webhooks
 * 2. Add webhook URL with Authorization header: Bearer <WEBHOOK_SECRET>
 *
 * Events handled:
 * - INITIAL_PURCHASE: User subscribed for first time
 * - RENEWAL: Subscription renewed
 * - CANCELLATION: User cancelled (still has access until period ends)
 * - EXPIRATION: Subscription period ended
 * - BILLING_ISSUE: Payment failed
 * - PRODUCT_CHANGE: User changed subscription tier
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// RevenueCat webhook event types
type EventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "CANCELLATION"
  | "UNCANCELLATION"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "PRODUCT_CHANGE"
  | "TRANSFER"
  | "SUBSCRIBER_ALIAS"
  | "SUBSCRIPTION_PAUSED"
  | "SUBSCRIPTION_EXTENDED"
  | "NON_RENEWING_PURCHASE"
  | "TEST";

interface RevenueCatEvent {
  type: EventType;
  id: string;
  app_user_id: string;
  original_app_user_id: string;
  product_id: string;
  entitlement_ids: string[];
  period_type: "TRIAL" | "INTRO" | "NORMAL" | "PROMOTIONAL";
  purchased_at_ms: number;
  expiration_at_ms: number | null;
  environment: "SANDBOX" | "PRODUCTION";
  store: "APP_STORE" | "PLAY_STORE" | "STRIPE" | "PROMOTIONAL";
  is_family_share: boolean;
  price_in_purchased_currency: number;
  currency: string;
}

interface WebhookPayload {
  api_version: string;
  event: RevenueCatEvent;
}

// Entitlement ID for Chef tier (must match RevenueCat dashboard)
const CHEF_ENTITLEMENT = "chef";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Parse payload first to check event type
    const payload: WebhookPayload = await req.json();
    const { event } = payload;

    // Verify webhook secret (skip for TEST events from dashboard)
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    const authHeader = req.headers.get("Authorization");

    console.log(
      "[webhook] Auth header received:",
      authHeader ? "present" : "null"
    );
    console.log("[webhook] Event type:", event.type);

    // Accept both "Bearer <secret>" and raw "<secret>" formats
    const isValid =
      authHeader === `Bearer ${webhookSecret}` || authHeader === webhookSecret;

    // Skip auth check for TEST events (dashboard test button doesn't send auth)
    if (webhookSecret && !isValid && event.type !== "TEST") {
      console.error(
        "[webhook] Unauthorized - invalid auth header for non-TEST event"
      );
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          debug: {
            received: authHeader ? `${authHeader.substring(0, 20)}...` : "null",
            expected_format: "Bearer <secret>",
          },
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[webhook] Received event: ${event.type} for user: ${event.app_user_id}`
    );
    console.log(
      `[webhook] Entitlements: ${event.entitlement_ids?.join(", ") || "none"}`
    );
    console.log(`[webhook] Environment: ${event.environment}`);

    // Skip anonymous users - they haven't logged in yet
    // RevenueCat anonymous IDs start with $RCAnonymousID:
    if (event.app_user_id.startsWith("$RCAnonymousID:")) {
      console.log("[webhook] Skipping anonymous user - will sync after login");
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "anonymous_user",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Skip sandbox events in production (optional - remove if you want to process sandbox)
    // if (event.environment === "SANDBOX" && Deno.env.get("ENVIRONMENT") === "production") {
    //   console.log("[webhook] Skipping sandbox event in production");
    //   return new Response(JSON.stringify({ success: true, skipped: true }), {
    //     status: 200,
    //     headers: { ...corsHeaders, "Content-Type": "application/json" },
    //   });
    // }

    // Get Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Handle TEST events from RevenueCat dashboard
    if (event.type === "TEST") {
      console.log("[webhook] Test event received successfully");
      return new Response(
        JSON.stringify({ success: true, message: "Test event received" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine new tier based on event and entitlements
    const hasChefEntitlement =
      event.entitlement_ids?.includes(CHEF_ENTITLEMENT) ?? false;
    let newTier: "free" | "chef" = "free";
    let expirationDate: string | null = null;

    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION":
      case "SUBSCRIPTION_EXTENDED":
      case "PRODUCT_CHANGE":
        // Active subscription - grant access
        if (hasChefEntitlement) {
          newTier = "chef";
          expirationDate = event.expiration_at_ms
            ? new Date(event.expiration_at_ms).toISOString()
            : null;
        }
        break;

      case "EXPIRATION":
      case "BILLING_ISSUE":
        // Subscription ended - revoke access
        newTier = "free";
        expirationDate = null;
        break;

      case "CANCELLATION":
        // User cancelled but may still have access until expiration
        // Keep their tier but note the cancellation
        if (hasChefEntitlement && event.expiration_at_ms) {
          const expiresAt = new Date(event.expiration_at_ms);
          if (expiresAt > new Date()) {
            newTier = "chef";
            expirationDate = expiresAt.toISOString();
            console.log(
              `[webhook] User cancelled but has access until ${expirationDate}`
            );
          }
        }
        break;

      case "NON_RENEWING_PURCHASE":
        // One-time purchase (lifetime)
        if (hasChefEntitlement) {
          newTier = "chef";
          expirationDate = null; // Lifetime - no expiration
        }
        break;

      default:
        // Other events (TRANSFER, SUBSCRIBER_ALIAS, etc.) - log but don't modify
        console.log(`[webhook] Unhandled event type: ${event.type}`);
        return new Response(
          JSON.stringify({ success: true, action: "ignored" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    const userId = event.app_user_id;

    // Update user_rate_limits table
    const { error: rateLimitError } = await supabaseAdmin
      .from("user_rate_limits")
      .upsert(
        {
          user_id: userId,
          tier: newTier,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (rateLimitError) {
      console.error(
        "[webhook] Failed to update user_rate_limits:",
        rateLimitError
      );
    }

    // Ensure user exists in public.users before updating
    // New users may not have a row yet if they purchased before onboarding completed
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (!existingUser) {
      // User doesn't exist - fetch email from auth.users and create
      const { data: authUser } =
        await supabaseAdmin.auth.admin.getUserById(userId);
      const email =
        authUser?.user?.email || `user-${userId.substring(0, 8)}@temp.local`;

      console.log(`[webhook] Creating user ${userId} with email ${email}`);

      const { error: createError } = await supabaseAdmin.from("users").insert({
        id: userId,
        email,
        subscription_tier: newTier,
        subscription_expires_at: expirationDate,
      });

      if (createError) {
        console.error("[webhook] Failed to create user:", createError);
      }
    } else {
      // User exists - update subscription fields
      const { error: userError } = await supabaseAdmin
        .from("users")
        .update({
          subscription_tier: newTier,
          subscription_expires_at: expirationDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (userError) {
        console.error("[webhook] Failed to update users table:", userError);
      }
    }

    // Track analytics event
    await supabaseAdmin.from("analytics_events").insert({
      event_name: `subscription_${event.type.toLowerCase()}`,
      properties: {
        product_id: event.product_id,
        tier: newTier,
        environment: event.environment,
        store: event.store,
        price: event.price_in_purchased_currency,
        currency: event.currency,
      },
      user_id: userId,
      created_at: new Date().toISOString(),
    });

    console.log(`[webhook] Updated user ${userId} to tier: ${newTier}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        new_tier: newTier,
        event_type: event.type,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[webhook] Error processing event:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
