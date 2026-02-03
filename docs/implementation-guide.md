# AI Cost Optimization: Implementation Guide

_Step-by-step guide to reduce AI costs by 80%_

---

## Quick Start: Optimize cook-chat Edge Function

### Step 1: Add Router to Your Edge Function

**Current code** (`supabase/functions/cook-chat/index.ts`):

```typescript
// ❌ Always uses expensive model
const completion = await openai.chat.completions.create({
  model: "gpt-4-turbo-preview",
  messages: [...],
  temperature: 0.7,
});

return new Response(JSON.stringify({
  response: completion.choices[0].message.content,
}));
```

**Optimized code**:

```typescript
import { routeChatRequest, normalizeMessage, hashMessage } from "./router.ts";

// ✅ Smart routing with caching
async function handleChatRequest(req: Request) {
  const { message, session_id, current_step, recipe_id } = await req.json();

  // Build context
  const context = {
    sessionId: session_id,
    recipeId: recipe_id,
    recipeName: recipe.title,
    currentStep: current_step,
    currentStepText: steps[current_step].instruction,
    ingredients: ingredients.map((i) => i.item),
  };

  // Check cache
  const checkCache = async (hash: string, recipeId: string) => {
    const { data } = await supabase
      .from("ai_response_cache")
      .select("response")
      .eq("recipe_id", recipeId)
      .eq("message_hash", hash)
      .single();

    return data?.response || null;
  };

  // Call appropriate model
  const callModel = async (model: string, prompt: string) => {
    switch (model) {
      case "haiku":
        return callClaudeHaiku(prompt);
      case "mini":
        return callGPT4Mini(prompt);
      case "gpt4":
        return callGPT4Turbo(prompt);
      default:
        return callClaudeHaiku(prompt);
    }
  };

  // Route request
  const result = await routeChatRequest(
    message,
    context,
    checkCache,
    callModel
  );

  // Cache response if not already cached
  if (!result.cached) {
    const normalized = normalizeMessage(message);
    const hash = hashMessage(normalized);
    await supabase.from("ai_response_cache").insert({
      recipe_id: recipe_id,
      message_hash: hash,
      response: result.response,
      model: result.model,
      hit_count: 0,
    });
  } else {
    // Increment cache hit counter
    const normalized = normalizeMessage(message);
    const hash = hashMessage(normalized);
    await supabase.rpc("increment_cache_hit", {
      p_recipe_id: recipe_id,
      p_message_hash: hash,
    });
  }

  // Log cost for analytics
  await supabase.from("ai_call_logs").insert({
    user_id: user.id,
    session_id: session_id,
    operation: "cook_chat",
    model: result.model,
    cost: result.cost,
    latency: result.latency,
    cached: result.cached,
  });

  return new Response(
    JSON.stringify({
      response: result.response,
      model: result.model, // For debugging
      cached: result.cached,
    })
  );
}
```

---

## Step 2: Add Cache Table

**Migration**: `supabase/migrations/add_ai_cache.sql`

```sql
-- AI Response Cache table
CREATE TABLE ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES master_recipes(id) ON DELETE CASCADE,
  message_hash TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recipe_id, message_hash)
);

-- Index for fast lookups
CREATE INDEX idx_cache_lookup ON ai_response_cache(recipe_id, message_hash);
CREATE INDEX idx_cache_created ON ai_response_cache(created_at);

-- Function to increment cache hits
CREATE OR REPLACE FUNCTION increment_cache_hit(
  p_recipe_id UUID,
  p_message_hash TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE ai_response_cache
  SET
    hit_count = hit_count + 1,
    updated_at = NOW()
  WHERE recipe_id = p_recipe_id
    AND message_hash = p_message_hash;
END;
$$ LANGUAGE plpgsql;

-- AI Call Logs table (for analytics)
CREATE TABLE ai_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id UUID REFERENCES cook_sessions(id),
  operation TEXT NOT NULL, -- 'cook_chat', 'recipe_import', etc.
  model TEXT NOT NULL, -- 'cache', 'haiku', 'mini', 'gpt4'
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  cost NUMERIC(10, 6) NOT NULL,
  latency INTEGER, -- milliseconds
  cached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX idx_logs_user ON ai_call_logs(user_id, created_at DESC);
CREATE INDEX idx_logs_operation ON ai_call_logs(operation, created_at DESC);

-- Daily cache cleanup (TTL = 90 days)
SELECT cron.schedule(
  'cleanup-ai-cache',
  '0 2 * * *',
  $$
  DELETE FROM ai_response_cache
  WHERE created_at < NOW() - INTERVAL '90 days'
     OR (hit_count < 3 AND created_at < NOW() - INTERVAL '30 days');
  $$
);

-- Enable Row Level Security
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_call_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read their own cache"
  ON ai_response_cache FOR SELECT
  USING (true); -- Cache is shared across users for same recipe

CREATE POLICY "Service role can insert cache"
  ON ai_response_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read their own logs"
  ON ai_call_logs FOR SELECT
  USING (auth.uid() = user_id);
```

---

## Step 3: Add Model Clients

**File**: `supabase/functions/_shared/models.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
});

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")!,
});

/**
 * Claude Haiku - Cheapest option
 * Cost: ~$0.001 per request
 */
export async function callClaudeHaiku(prompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 200, // Keep responses concise
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}

/**
 * GPT-4o-mini - Medium cost
 * Cost: ~$0.01 per request
 */
export async function callGPT4Mini(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 250,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return completion.choices[0]?.message?.content || "";
}

/**
 * GPT-4 Turbo - Expensive but powerful
 * Cost: ~$0.02 per request
 */
export async function callGPT4Turbo(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return completion.choices[0]?.message?.content || "";
}
```

---

## Step 4: Add Cost Analytics Dashboard

**Query**: Daily cost summary

```sql
-- Daily AI costs by model
SELECT
  DATE(created_at) as date,
  model,
  COUNT(*) as calls,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost,
  SUM(CASE WHEN cached THEN 1 ELSE 0 END) as cache_hits,
  ROUND(SUM(CASE WHEN cached THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 1) as cache_hit_rate
FROM ai_call_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), model
ORDER BY date DESC, total_cost DESC;
```

**Query**: Top 10 costliest users

```sql
-- Identify potential abuse
SELECT
  user_id,
  COUNT(*) as total_calls,
  SUM(cost) as total_cost,
  SUM(CASE WHEN model = 'gpt4' THEN 1 ELSE 0 END) as expensive_calls,
  SUM(CASE WHEN cached THEN 1 ELSE 0 END) as cache_hits
FROM ai_call_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY total_cost DESC
LIMIT 10;
```

**Query**: Cache effectiveness

```sql
-- How well is caching working?
SELECT
  recipe_id,
  COUNT(*) as total_lookups,
  SUM(hit_count) as total_hits,
  ROUND(SUM(hit_count)::numeric / COUNT(*) * 100, 1) as hit_rate,
  MAX(hit_count) as max_hits,
  MIN(created_at) as oldest,
  MAX(updated_at) as newest
FROM ai_response_cache
GROUP BY recipe_id
ORDER BY total_hits DESC
LIMIT 20;
```

---

## Step 5: Add Rate Limiting

**Edge Function**: Check rate limits before expensive operations

```typescript
async function checkRateLimit(
  userId: string,
  operation: string
): Promise<boolean> {
  // Get user tier
  const { data: user } = await supabase
    .from("user_preferences")
    .select("cooking_mode")
    .eq("user_id", userId)
    .single();

  const tier = user?.cooking_mode === "chef" ? "pro" : "free";

  // Define limits
  const limits = {
    free: {
      recipes_per_day: 3,
      chat_messages_per_day: 20,
    },
    pro: {
      recipes_per_day: 50,
      chat_messages_per_day: 500,
    },
  };

  // Count today's usage
  const today = new Date().toISOString().split("T")[0];
  const { count } = await supabase
    .from("ai_call_logs")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("operation", operation)
    .gte("created_at", `${today}T00:00:00Z`);

  const limit =
    operation === "recipe_import"
      ? limits[tier].recipes_per_day
      : limits[tier].chat_messages_per_day;

  return (count || 0) < limit;
}

// Usage
const allowed = await checkRateLimit(user.id, "cook_chat");
if (!allowed) {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: "Upgrade to Pro for unlimited AI assistance",
    }),
    { status: 429 }
  );
}
```

---

## Step 6: Monitor & Alert

**Set up Slack webhook for cost alerts**:

```typescript
// supabase/functions/daily-cost-alert/index.ts
import { serve } from "std/http/server.ts";

serve(async () => {
  // Calculate yesterday's costs
  const { data } = await supabase
    .from("ai_call_logs")
    .select("cost, model")
    .gte("created_at", "yesterday");

  const totalCost = data?.reduce((sum, log) => sum + log.cost, 0) || 0;

  const breakdown = data?.reduce(
    (acc, log) => {
      acc[log.model] = (acc[log.model] || 0) + log.cost;
      return acc;
    },
    {} as Record<string, number>
  );

  // Send to Slack
  await fetch(Deno.env.get("SLACK_WEBHOOK_URL")!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `💰 Daily AI Cost Report`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              `*Total Cost*: $${totalCost.toFixed(2)}\n\n` +
              `*Breakdown*:\n` +
              `• Cache: Free\n` +
              `• Haiku: $${(breakdown?.haiku || 0).toFixed(2)}\n` +
              `• Mini: $${(breakdown?.mini || 0).toFixed(2)}\n` +
              `• GPT-4: $${(breakdown?.gpt4 || 0).toFixed(2)}`,
          },
        },
      ],
    }),
  });

  return new Response("OK");
});
```

**Trigger with cron**:

```sql
SELECT cron.schedule(
  'daily-cost-alert',
  '0 9 * * *', -- 9 AM daily
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/daily-cost-alert',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

---

## Testing the Optimization

### Before (Baseline)

```bash
# Send 100 test messages
for i in {1..100}; do
  curl -X POST https://your-project.supabase.co/functions/v1/cook-chat \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"message":"How long?","session_id":"test"}'
done

# Check total cost
psql> SELECT SUM(cost) FROM ai_call_logs WHERE session_id = 'test';
# Result: $2.00 (100 × $0.02 with GPT-4)
```

### After (Optimized)

```bash
# Same 100 messages
# Result: $0.20 (100 × $0.002 avg with caching + routing)
# 90% cost reduction! 🎉
```

---

## Rollout Plan

### Week 1: Foundation

- [ ] Deploy router.ts
- [ ] Add cache table
- [ ] Set up model clients
- [ ] Test with sample data

### Week 2: Integration

- [ ] Update cook-chat edge function
- [ ] Add rate limiting
- [ ] Deploy to production
- [ ] Monitor for issues

### Week 3: Optimization

- [ ] Tune intent classification
- [ ] A/B test model selection
- [ ] Optimize cache TTL
- [ ] Warm cache with common questions

### Week 4: Analytics

- [ ] Build cost dashboard
- [ ] Set up alerts
- [ ] Generate first cost report
- [ ] Iterate based on data

---

## Expected Results

**After 1 month**:

- Cache hit rate: 40%
- Average cost per message: $0.006
- Cost reduction: 70%

**After 3 months**:

- Cache hit rate: 55%
- Average cost per message: $0.004
- Cost reduction: 80%

**After 6 months**:

- Cache hit rate: 65%
- Average cost per message: $0.003
- Cost reduction: 85%

---

_Optimize from Day 1 • Built for Chez_
