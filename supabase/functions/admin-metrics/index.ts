import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Admin user IDs - server-side enforcement
// TODO: Move to ADMIN_USER_IDS env var for production
const ADMIN_USER_IDS = [
  "3a03079e-b93b-4379-951d-c998a168b379", // mateodaza@gmail.com
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate admin user via JWT (server-side enforcement)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user || !ADMIN_USER_IDS.includes(user.id)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for queries (can read all data)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Time ranges
    const now = Date.now();
    const oneDayAgo = new Date(now - 86400000).toISOString();
    const sevenDaysAgo = new Date(now - 604800000).toISOString();
    const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ).toISOString();

    // Fetch all metrics in parallel
    const [
      usersResult,
      recipesResult,
      messagesResult,
      intentsResult,
      costResult,
      modelBreakdownResult,
      sessionsResult,
      completedSessionsResult,
    ] = await Promise.all([
      // Total users
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
      // Total recipes
      supabaseAdmin
        .from("master_recipes")
        .select("*", { count: "exact", head: true }),
      // Messages last 24h
      supabaseAdmin
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("event_name", "chat_message_sent")
        .gte("created_at", oneDayAgo),
      // Intents last 7 days
      supabaseAdmin
        .from("analytics_events")
        .select("properties")
        .eq("event_name", "chat_message_sent")
        .gte("created_at", sevenDaysAgo),
      // AI costs this month
      supabaseAdmin
        .from("ai_cost_logs")
        .select("cost_usd, model")
        .gte("created_at", startOfMonth),
      // Model breakdown last 30 days
      supabaseAdmin
        .from("ai_cost_logs")
        .select("model, cost_usd")
        .gte("created_at", thirtyDaysAgo),
      // Cook sessions last 7 days
      supabaseAdmin
        .from("cook_sessions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo),
      // Completed sessions last 7 days
      supabaseAdmin
        .from("cook_sessions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo)
        .eq("is_complete", true),
    ]);

    // Count intents from last 7 days
    const intentCounts = (intentsResult.data || []).reduce(
      (acc: Record<string, number>, { properties }) => {
        const intent = (properties as any)?.intent_type || "unknown";
        acc[intent] = (acc[intent] || 0) + 1;
        return acc;
      },
      {}
    );

    // Calculate cost metrics
    const costData = costResult.data || [];
    const totalCostMonth = costData.reduce(
      (sum, row) => sum + (row.cost_usd || 0),
      0
    );
    const totalRequests = costData.length;

    // Model breakdown
    const modelData = modelBreakdownResult.data || [];
    const modelCounts: Record<string, { count: number; cost: number }> = {};
    modelData.forEach((row) => {
      const model = row.model || "unknown";
      if (!modelCounts[model]) {
        modelCounts[model] = { count: 0, cost: 0 };
      }
      modelCounts[model].count++;
      modelCounts[model].cost += row.cost_usd || 0;
    });

    // Format model breakdown as array sorted by count
    const modelBreakdown = Object.entries(modelCounts)
      .map(([model, data]) => ({
        model: model.split("/").pop() || model, // Just show model name, not provider
        count: data.count,
        cost: data.cost,
        percentage:
          modelData.length > 0
            ? ((data.count / modelData.length) * 100).toFixed(0)
            : "0",
      }))
      .sort((a, b) => b.count - a.count);

    const totalUsers = usersResult.count || 0;
    const messagesLast24h = messagesResult.count || 0;
    const sessionsLast7d = sessionsResult.count || 0;
    const completedLast7d = completedSessionsResult.count || 0;

    const metrics = {
      // Core metrics
      totalUsers,
      recipesImported: recipesResult.count || 0,
      messagesLast24h,
      avgMessagesPerUser:
        totalUsers > 0 ? (messagesLast24h / totalUsers).toFixed(1) : "0",

      // Cost metrics
      totalCostMonth: totalCostMonth.toFixed(4),
      avgCostPerRequest:
        totalRequests > 0 ? (totalCostMonth / totalRequests).toFixed(6) : "0",
      totalRequestsMonth: totalRequests,

      // Session metrics
      sessionsLast7d,
      completionRate:
        sessionsLast7d > 0
          ? ((completedLast7d / sessionsLast7d) * 100).toFixed(0)
          : "0",

      // Breakdowns
      topIntents: Object.entries(intentCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5),
      modelBreakdown: modelBreakdown.slice(0, 4),
    };

    return new Response(JSON.stringify(metrics), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Admin metrics error:", error);
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
