# AI Cost Optimization Strategy

_Goal: Reduce AI costs by 80% while maintaining quality_

---

## Current Cost Structure (Expensive!)

| Operation     | Model       | Cost per Call   | Monthly Cost (1k users) |
| ------------- | ----------- | --------------- | ----------------------- |
| Recipe import | GPT-4 Turbo | $0.05           | $250 (5 recipes/user)   |
| Cooking chat  | GPT-4 Turbo | $0.02           | $500 (25 msgs/user)     |
| TTS           | OpenAI TTS  | $0.015/1k chars | $150                    |
| **Total**     |             |                 | **$900/mo**             |

**Problem**: At 100k users, this is **$90k/month** in AI costs alone 🔴

---

## Optimized Cost Structure (Smart Routing!)

| Operation     | Model                           | Cost per Call   | Monthly Cost (1k users) |
| ------------- | ------------------------------- | --------------- | ----------------------- |
| Recipe import | GPT-4o-mini (80%) + GPT-4 (20%) | $0.012 avg      | $60                     |
| Cooking chat  | Haiku (70%) + GPT-4o-mini (30%) | $0.004 avg      | $100                    |
| TTS           | Cached + OpenAI                 | $0.003/1k chars | $30                     |
| **Total**     |                                 |                 | **$190/mo**             |

**Savings**: 79% reduction → **$19k/month at 100k users** ✅

---

## Smart Routing Strategy

### 1. Recipe Import Pipeline

```typescript
// Decision tree for recipe parsing
async function parseRecipe(url: string) {
  const source = detectSource(url); // youtube, tiktok, website

  // Route 1: Known creator with cached recipes (0% AI cost)
  if (await hasCachedCreatorRecipes(source.creatorId)) {
    return fetchFromCache(source.creatorId, url);
  }

  // Route 2: Simple recipe (cheap model)
  if (isSimpleRecipe(source)) {
    // Use GPT-4o-mini ($0.01 per recipe)
    return parseWithMini(url);
  }

  // Route 3: Complex recipe (expensive model)
  // Only 20% of recipes hit this path
  return parseWithGPT4(url);
}

function isSimpleRecipe(source: Source): boolean {
  // Heuristics for cheap parsing:
  return (
    source.platform === "tiktok" || // Short videos = simple
    source.duration < 300 || // < 5 min videos
    source.hasTranscript === true // Easy to parse
  );
}
```

**Cost Impact**:

- 30% cached (free)
- 50% GPT-4o-mini ($0.01)
- 20% GPT-4 Turbo ($0.05)
- **Average: $0.012 per recipe** (76% savings!)

---

### 2. Cooking Chat Pipeline

```typescript
// Decision tree for chat responses
async function handleCookingChat(message: string, context: CookingContext) {
  const intent = classifyIntent(message); // Local/cheap classification

  // Route 1: Simple Q&A (Claude Haiku - $0.001)
  if (intent.type === "simple_question") {
    // "How long do I cook this?"
    // "What temperature?"
    return answerWithHaiku(message, context);
  }

  // Route 2: Cached responses (free)
  if (await hasCachedResponse(message, context.recipeId)) {
    return fetchCachedResponse(message, context.recipeId);
  }

  // Route 3: Learning/substitution (GPT-4o-mini - $0.01)
  if (intent.type === "substitution" || intent.type === "modification") {
    // "Can I use oat milk instead?"
    return handleSubstitutionWithMini(message, context);
  }

  // Route 4: Complex reasoning (GPT-4 Turbo - $0.02)
  if (intent.type === "complex" || intent.type === "troubleshooting") {
    // "My sauce is breaking, what do I do?"
    return handleComplexWithGPT4(message, context);
  }

  // Default: Use cheap model
  return answerWithHaiku(message, context);
}
```

**Cost Impact**:

- 40% cached (free)
- 40% Haiku ($0.001)
- 15% GPT-4o-mini ($0.01)
- 5% GPT-4 Turbo ($0.02)
- **Average: $0.004 per message** (80% savings!)

---

### 3. Intent Classification (Local/Fast)

**Key principle**: Don't use expensive AI to decide which AI to use!

```typescript
// Local intent classification (no API cost)
function classifyIntent(message: string): Intent {
  const lower = message.toLowerCase();

  // Simple patterns (no AI needed)
  if (lower.match(/how long|how much time|duration|minutes/)) {
    return { type: "simple_question", confidence: 0.9 };
  }

  if (lower.match(/instead of|substitute|replace|swap/)) {
    return { type: "substitution", confidence: 0.9 };
  }

  if (lower.match(/what if|why|how come|went wrong|not working/)) {
    return { type: "complex", confidence: 0.8 };
  }

  // Default to simple
  return { type: "simple_question", confidence: 0.5 };
}
```

---

## Implementation Architecture

### Phase 1: Smart Routing Layer

```
supabase/functions/cook-chat/
├── index.ts              # Main entry point
├── router.ts             # Smart routing logic
├── models/
│   ├── haiku.ts          # Claude Haiku calls
│   ├── mini.ts           # GPT-4o-mini calls
│   └── gpt4.ts           # GPT-4 Turbo calls
├── cache.ts              # Response caching
└── intent.ts             # Local classification
```

**Example: cook-chat router**:

```typescript
// supabase/functions/cook-chat/router.ts
export async function routeChatRequest(
  message: string,
  context: CookingContext
): Promise<{ model: string; response: string; cost: number }> {
  // 1. Check cache first (free)
  const cached = await checkCache(message, context.recipeId);
  if (cached) {
    return { model: "cache", response: cached, cost: 0 };
  }

  // 2. Classify intent locally (free)
  const intent = classifyIntent(message);

  // 3. Route to appropriate model
  switch (intent.type) {
    case "simple_question":
      const haikuResponse = await callHaiku(message, context);
      await cacheResponse(message, context.recipeId, haikuResponse);
      return { model: "haiku", response: haikuResponse, cost: 0.001 };

    case "substitution":
      const miniResponse = await callMini(message, context);
      return { model: "mini", response: miniResponse, cost: 0.01 };

    case "complex":
      const gpt4Response = await callGPT4(message, context);
      return { model: "gpt4", response: gpt4Response, cost: 0.02 };

    default:
      // Default to cheapest
      const defaultResponse = await callHaiku(message, context);
      return { model: "haiku", response: defaultResponse, cost: 0.001 };
  }
}
```

---

### Phase 2: Response Caching

**Key insight**: Most users ask the same questions!

```typescript
// Cache structure
interface CachedResponse {
  recipeId: string;
  messageHash: string; // Hash of normalized message
  response: string;
  model: string;
  hitCount: number; // Track cache effectiveness
  createdAt: string;
}

// Cache strategy
async function checkCache(
  message: string,
  recipeId: string
): Promise<string | null> {
  // Normalize message (remove capitalization, punctuation)
  const normalized = normalizeMessage(message);
  const hash = hashMessage(normalized);

  // Check Supabase cache table
  const { data } = await supabase
    .from("ai_response_cache")
    .select("response")
    .eq("recipe_id", recipeId)
    .eq("message_hash", hash)
    .single();

  if (data) {
    // Track cache hit for analytics
    await incrementCacheHit(recipeId, hash);
    return data.response;
  }

  return null;
}

// Cache common questions globally (not per recipe)
const GLOBAL_CACHE_PATTERNS = [
  { pattern: /how long/, response: "Check the timer for this step." },
  { pattern: /what temperature/, response: "The temperature is shown above." },
  {
    pattern: /how much/,
    response: "The quantity is listed in the ingredients.",
  },
];
```

**Cache Hit Rate Projection**:

- Week 1: 10% (cold cache)
- Month 1: 30% (warming up)
- Month 3: 50% (mature)
- Month 6: 60%+ (hot cache)

**Cost Impact at 60% cache hit rate**:

- 60% free (cached)
- 40% AI ($0.004 avg)
- **Effective cost: $0.0016 per message** 🔥

---

### Phase 3: Prompt Optimization

**Reduce token usage by 50%**:

```typescript
// ❌ BAD: Verbose prompt (500 tokens)
const badPrompt = `
You are a helpful cooking assistant. The user is currently cooking a recipe.
Here is the full recipe with all ingredients and all steps:
${JSON.stringify(recipe, null, 2)}

The user has asked the following question:
"${message}"

Please provide a helpful, friendly, and detailed response to their question.
Make sure to be encouraging and supportive in your response.
`;

// ✅ GOOD: Concise prompt (150 tokens)
const goodPrompt = `
Recipe: ${recipe.title}
Current step: ${currentStep.instruction}
User: "${message}"
Assistant:`;

// Cost savings: 70% reduction in tokens = 70% cost reduction
```

**Optimize by task**:

```typescript
// Simple Q&A: Minimal context
const simplePrompt = `
Step ${stepNum}: ${step.instruction}
Q: ${message}
A:`;

// Substitution: Focused context
const substitutionPrompt = `
Ingredients: ${ingredients.join(", ")}
User wants to substitute: ${message}
Suggest alternative:`;

// Complex: Full context (only when needed)
const complexPrompt = `
Recipe: ${recipe.title}
All steps: ${steps.map((s) => s.instruction).join("\n")}
Issue: ${message}
Solution:`;
```

---

## Cost Tracking & Analytics

**Add telemetry to every AI call**:

```typescript
// Track AI usage for analytics
interface AICallMetrics {
  userId: string;
  sessionId: string;
  operation: 'recipe_import' | 'cook_chat' | 'tts';
  model: 'gpt4' | 'mini' | 'haiku' | 'cache';
  promptTokens: number;
  completionTokens: number;
  cost: number;
  latency: number;
  createdAt: string;
}

// Log every call
async function logAICall(metrics: AICallMetrics) {
  await supabase.from('ai_call_logs').insert(metrics);
}

// Dashboard query: Cost per user
SELECT
  user_id,
  COUNT(*) as total_calls,
  SUM(cost) as total_cost,
  AVG(cost) as avg_cost_per_call,
  SUM(CASE WHEN model = 'cache' THEN 1 ELSE 0 END) as cache_hits
FROM ai_call_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id
ORDER BY total_cost DESC;
```

---

## Rate Limiting & Abuse Prevention

**Prevent users from spamming expensive AI calls**:

```typescript
// Rate limits by tier
const RATE_LIMITS = {
  free: {
    recipes_per_day: 3,
    chat_messages_per_day: 20,
    chat_messages_per_minute: 5,
  },
  pro: {
    recipes_per_day: 50,
    chat_messages_per_day: 500,
    chat_messages_per_minute: 20,
  },
};

// Check rate limit before expensive operations
async function checkRateLimit(
  userId: string,
  operation: "recipe_import" | "cook_chat"
): Promise<{ allowed: boolean; remaining: number }> {
  const userTier = await getUserTier(userId);
  const limits = RATE_LIMITS[userTier];

  const today = new Date().toISOString().split("T")[0];

  const { count } = await supabase
    .from("ai_call_logs")
    .select("id", { count: "exact" })
    .eq("user_id", userId)
    .eq("operation", operation)
    .gte("created_at", `${today}T00:00:00Z`);

  const limit =
    operation === "recipe_import"
      ? limits.recipes_per_day
      : limits.chat_messages_per_day;

  return {
    allowed: (count || 0) < limit,
    remaining: limit - (count || 0),
  };
}
```

---

## Migration Plan: Optimize Existing Edge Functions

### Step 1: Add Model Selection to recipe-import

**Current** (`supabase/functions/recipe-import/index.ts`):

```typescript
// Always uses GPT-4 Turbo
const completion = await openai.chat.completions.create({
  model: "gpt-4-turbo-preview",
  messages: [...],
});
```

**Optimized**:

```typescript
// Smart model selection
const complexity = assessRecipeComplexity(transcript);

const model = complexity === 'simple'
  ? 'gpt-4o-mini'      // $0.01 per recipe
  : 'gpt-4-turbo';     // $0.05 per recipe

const completion = await openai.chat.completions.create({
  model,
  messages: [...],
});

// Log cost
await logAICall({
  operation: 'recipe_import',
  model,
  cost: model === 'gpt-4o-mini' ? 0.01 : 0.05,
  // ...
});
```

### Step 2: Add Caching to cook-chat

**Current** (`supabase/functions/cook-chat/index.ts`):

```typescript
// Always calls AI
const response = await openai.chat.completions.create({...});
```

**Optimized**:

```typescript
// Check cache first
const cached = await checkCache(message, sessionId);
if (cached) {
  return new Response(JSON.stringify({ response: cached }));
}

// Route to appropriate model
const { model, response, cost } = await routeChatRequest(message, context);

// Cache response
await cacheResponse(message, sessionId, response);

return new Response(JSON.stringify({ response, model, cost }));
```

---

## Expected Results

### Cost Reduction Timeline

| Month    | Cache Hit Rate | Avg Cost per User | Monthly Cost (100k users) | Savings vs Original |
| -------- | -------------- | ----------------- | ------------------------- | ------------------- |
| Month 1  | 20%            | $0.70             | $70,000                   | 22%                 |
| Month 3  | 40%            | $0.45             | $45,000                   | 50%                 |
| Month 6  | 55%            | $0.30             | $30,000                   | 67%                 |
| Month 12 | 65%            | $0.20             | $20,000                   | 78%                 |

**Target**: **80% cost reduction by Month 12**

---

## Action Items for Next Sprint

### Priority 1 (Week 1): Implement Smart Routing

- [ ] Create router.ts with model selection logic
- [ ] Add intent classification to cook-chat
- [ ] Switch recipe-import to use GPT-4o-mini for simple recipes
- [ ] Add cost logging to all AI calls

### Priority 2 (Week 2): Add Caching

- [ ] Create ai_response_cache table in Supabase
- [ ] Implement cache check in cook-chat
- [ ] Add cache warming for common questions
- [ ] Build cache analytics dashboard

### Priority 3 (Week 3): Optimize Prompts

- [ ] Audit all prompts for token waste
- [ ] Create minimal context versions
- [ ] A/B test prompt variations
- [ ] Measure quality vs cost tradeoff

### Priority 4 (Week 4): Add Rate Limiting

- [ ] Implement rate limit checks
- [ ] Add user tier management
- [ ] Build rate limit dashboard
- [ ] Test abuse scenarios

---

## Monitoring & Alerts

**Set up alerts for cost anomalies**:

```sql
-- Alert if daily AI costs spike >20%
SELECT
  DATE(created_at) as date,
  SUM(cost) as daily_cost,
  LAG(SUM(cost)) OVER (ORDER BY DATE(created_at)) as prev_day_cost,
  (SUM(cost) - LAG(SUM(cost)) OVER (ORDER BY DATE(created_at))) /
    LAG(SUM(cost)) OVER (ORDER BY DATE(created_at)) * 100 as pct_change
FROM ai_call_logs
GROUP BY DATE(created_at)
HAVING pct_change > 20;
```

**Slack notification**:

- Daily cost summary
- Model usage breakdown
- Cache hit rate
- Top 10 costliest users (potential abuse)

---

## Summary: From $90k/mo to $20k/mo

| Strategy            | Monthly Savings (100k users) |
| ------------------- | ---------------------------- |
| Smart model routing | $40k                         |
| Response caching    | $20k                         |
| Prompt optimization | $7k                          |
| Rate limiting       | $3k                          |
| **Total Savings**   | **$70k/mo**                  |

**At 1M users**: Save **$700k/month** 🚀

---

_Built for Chez • Optimize from Day 1_
