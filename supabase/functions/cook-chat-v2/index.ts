import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// OPENROUTER MODULE (inlined from _shared/openrouter.ts)
// ============================================================================

interface ModelConfig {
  id: string;
  promptCost: number;
  completionCost: number;
  maxTokens: number;
  timeoutMs: number;
}

const MODELS: Record<string, ModelConfig> = {
  GEMINI_FLASH: {
    id: "google/gemini-2.5-flash",
    promptCost: 0.3,
    completionCost: 2.5,
    maxTokens: 500, // Tier 1: flexible limit
    timeoutMs: 10000,
  },
  GROQ_LLAMA_70B: {
    id: "groq/llama-3.1-70b-versatile",
    promptCost: 0.59,
    completionCost: 0.79,
    maxTokens: 800,
    timeoutMs: 10000,
  },
  GPT4O_MINI: {
    id: "openai/gpt-4o-mini",
    promptCost: 0.15,
    completionCost: 0.6,
    maxTokens: 800, // Tier 2: flexible limit
    timeoutMs: 15000,
  },
  CLAUDE_SONNET_4: {
    id: "anthropic/claude-sonnet-4.5",
    promptCost: 3.0,
    completionCost: 15.0,
    maxTokens: 1200, // Tier 3: flexible limit
    timeoutMs: 20000,
  },
};

function calculateCost(
  model: keyof typeof MODELS,
  promptTokens: number,
  completionTokens: number
): number {
  const config = MODELS[model];
  const promptCost = (promptTokens / 1_000_000) * config.promptCost;
  const completionCostCalc =
    (completionTokens / 1_000_000) * config.completionCost;
  return promptCost + completionCostCalc;
}

function isRetryableError(statusCode?: number): boolean {
  if (!statusCode) return false;
  return statusCode === 429 || statusCode === 408 || statusCode >= 500;
}

function parseError(error: unknown, statusCode?: number) {
  let errorMessage = "Unknown OpenRouter error";
  let errorCode: string | undefined;

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    errorMessage =
      (err.error as string) || (err.message as string) || errorMessage;
    errorCode = err.code as string;
  }

  return {
    error: errorMessage,
    code: errorCode,
    statusCode,
    retryable: isRetryableError(statusCode),
  };
}

async function callOpenRouter(
  model: keyof typeof MODELS,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  apiKey: string,
  maxTokens?: number, // Allow override
  retries = 2
) {
  const config = MODELS[model];
  const startTime = Date.now();

  // Use provided maxTokens or default to model's configured limit
  const tokenLimit = maxTokens ?? config.maxTokens;

  let lastError: any = null;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://chez.app",
            "X-Title": "Chez Cooking Assistant",
          },
          body: JSON.stringify({
            model: config.id,
            messages,
            max_tokens: tokenLimit,
            temperature: 0.7,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = parseError(errorData, response.status);

        if (lastError.retryable && attempt < retries) {
          attempt++;
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
          continue;
        }

        throw new Error(lastError.error);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;
      const cost = calculateCost(model, promptTokens, completionTokens);
      const latencyMs = Date.now() - startTime;
      const provider = data.model?.split("/")?.[0] || "unknown";

      return {
        content,
        promptTokens,
        completionTokens,
        cost,
        latencyMs,
        model: config.id,
        provider,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        lastError = {
          error: "Request timeout",
          code: "TIMEOUT",
          statusCode: 408,
          retryable: true,
        };
      } else if (!lastError) {
        lastError = parseError(error);
      }

      if (lastError.retryable && attempt < retries) {
        attempt++;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
        continue;
      }

      throw new Error(
        `OpenRouter API failed after ${attempt + 1} attempts: ${lastError.error}`
      );
    }
  }

  throw new Error("OpenRouter API failed: max retries exceeded");
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit token budget
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const estimated = estimateTokens(text);
  if (estimated <= maxTokens) return text;

  const maxChars = maxTokens * 4;
  return text.slice(0, maxChars) + "...";
}

function buildMessages(
  systemPrompt: string,
  userMessage: string,
  context?: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>,
  maxInputTokens: number = 3000
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const systemTokens = estimateTokens(systemPrompt);
  const userTokens = estimateTokens(userMessage);
  const reservedTokens = systemTokens + userTokens;

  // If base messages exceed budget, return minimal prompt
  if (reservedTokens >= maxInputTokens) {
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];
  }

  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: systemPrompt }];

  let remainingBudget = maxInputTokens - reservedTokens;

  // Context (truncate if needed)
  if (context && remainingBudget > 0) {
    const contextBudget = Math.min(Math.floor(remainingBudget * 0.6), 1000);
    if (contextBudget > 0) {
      const truncatedContext = truncateToTokens(context, contextBudget);
      messages.push({
        role: "system",
        content: `Context:\n${truncatedContext}`,
      });
      remainingBudget -= estimateTokens(truncatedContext);
    }
  }

  // History (truncate if needed, prioritize recent)
  if (history && history.length > 0 && remainingBudget > 0) {
    const historyBudget = Math.max(0, remainingBudget);
    let historyTokens = 0;
    const includedHistory: typeof history = [];

    // Add from most recent backwards
    for (let i = history.length - 1; i >= 0; i--) {
      const msgTokens = estimateTokens(history[i].content);
      if (historyTokens + msgTokens <= historyBudget) {
        includedHistory.unshift(history[i]);
        historyTokens += msgTokens;
      } else {
        break;
      }
    }

    messages.push(...includedHistory);
  }

  // User message last
  messages.push({ role: "user", content: userMessage });

  return messages;
}

// ============================================================================
// FALLBACK MODULE (inlined from _shared/fallback.ts)
// ============================================================================

function calculateClaudeCost(
  promptTokens: number,
  completionTokens: number
): number {
  const promptCost = (promptTokens / 1_000_000) * 3.0;
  const completionCost = (completionTokens / 1_000_000) * 15.0;
  return promptCost + completionCost;
}

async function callClaudeFallback(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  anthropicApiKey: string,
  modelKey: keyof typeof MODELS // FIX: Accept model key for tier-appropriate tokens
) {
  const startTime = Date.now();
  const maxTokens = MODELS[modelKey].maxTokens; // Use tier-appropriate limit

  const client = new Anthropic({ apiKey: anthropicApiKey });

  const systemMessage =
    messages.find((m) => m.role === "system")?.content ||
    "You are a helpful cooking assistant.";
  const conversationMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    temperature: 0.7,
    system: systemMessage,
    messages: conversationMessages,
  });

  const content =
    response.content[0]?.type === "text" ? response.content[0].text : "";
  const promptTokens = response.usage.input_tokens;
  const completionTokens = response.usage.output_tokens;
  const cost = calculateClaudeCost(promptTokens, completionTokens);
  const latency = Date.now() - startTime;

  return {
    response: content,
    cost,
    latency,
    model: "claude-sonnet-4-20250514",
    provider: "anthropic",
    promptTokens,
    completionTokens,
    fallback: true,
  };
}

function validateApiKeys(openrouterKey?: string, anthropicKey?: string) {
  const errors: string[] = [];
  if (!openrouterKey || openrouterKey.trim() === "") {
    errors.push("OPENROUTER_API_KEY is not configured");
  }
  if (!anthropicKey || anthropicKey.trim() === "") {
    errors.push("ANTHROPIC_API_KEY is not configured (required for fallback)");
  }
  return { valid: errors.length === 0, errors };
}

// ============================================================================
// REVENUECAT VERIFICATION MODULE
// ============================================================================

const CHEF_ENTITLEMENT = "chef";

interface RevenueCatSubscriber {
  entitlements: {
    [key: string]: {
      expires_date: string | null;
      product_identifier: string;
      purchase_date: string;
    };
  };
}

/**
 * Verify subscription tier with RevenueCat API as fallback.
 * Called when database shows "free" to catch webhook delays.
 * If RevenueCat shows active "chef" entitlement, updates database and returns "chef".
 */
async function verifyAndSyncTier(
  userId: string,
  dbTier: "free" | "chef",
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<"free" | "chef"> {
  // If database already says chef, trust it
  if (dbTier === "chef") {
    return "chef";
  }

  // Only verify with RevenueCat if database says free
  const revenueCatApiKey = Deno.env.get("REVENUECAT_API_KEY");
  if (!revenueCatApiKey) {
    console.log("[tier] REVENUECAT_API_KEY not set, using database tier");
    return dbTier;
  }

  try {
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${revenueCatApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // User not found in RevenueCat - they've never made a purchase
        return "free";
      }
      console.error("[tier] RevenueCat API error:", response.status);
      return dbTier;
    }

    const data = await response.json();
    const subscriber = data.subscriber as RevenueCatSubscriber;

    // Check if they have an active chef entitlement
    const chefEntitlement = subscriber.entitlements?.[CHEF_ENTITLEMENT];
    if (!chefEntitlement) {
      return "free";
    }

    // Check if entitlement is still active (not expired)
    const expiresDate = chefEntitlement.expires_date;
    if (expiresDate && new Date(expiresDate) < new Date()) {
      return "free";
    }

    // User has active chef entitlement - sync to database
    console.log(
      `[tier] RevenueCat shows active chef for ${userId}, syncing to DB`
    );

    // Update user_rate_limits
    await supabaseAdmin.from("user_rate_limits").upsert(
      {
        user_id: userId,
        tier: "chef",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    // Update users table
    await supabaseAdmin
      .from("users")
      .update({
        subscription_tier: "chef",
        subscription_expires_at: expiresDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return "chef";
  } catch (error) {
    console.error("[tier] RevenueCat verification failed:", error);
    return dbTier;
  }
}

// ============================================================================
// AI ROUTER MODULE (inlined from _shared/ai-router.ts)
// ============================================================================

function classifyIntent(message: string) {
  const lower = message.toLowerCase().trim();

  if (lower.match(/^(start|stop|pause|resume|set|cancel)\s+(timer|alarm)/)) {
    return {
      type: "timer_command",
      confidence: 0.98,
      requiresContext: false,
      requiresRAG: false,
    };
  }
  if (
    lower.match(
      /how long|how much time|duration|minutes|seconds|hours|when (is|will)/
    )
  ) {
    return {
      type: "timing_question",
      confidence: 0.95,
      requiresContext: true,
      requiresRAG: false,
    };
  }
  if (lower.match(/temperature|degrees|temp|how hot|how cold|oven|heat/)) {
    return {
      type: "temperature_question",
      confidence: 0.95,
      requiresContext: true,
      requiresRAG: false,
    };
  }
  if (lower.match(/how much|quantity|amount|measurement/)) {
    return {
      type: "simple_question",
      confidence: 0.9,
      requiresContext: true,
      requiresRAG: false,
    };
  }
  // Check troubleshooting BEFORE substitution to avoid false positives
  if (
    lower.match(
      /went wrong|not working|help|problem|issue|fix|broken|burnt|raw|overcooked|undercooked|clump|clumpy|clumping|separating|breaking|split|watery|soggy|tough|dry|rubbery|mushy|why (is|did)|keeps/
    )
  ) {
    return {
      type: "troubleshooting",
      confidence: 0.85,
      requiresContext: true,
      requiresRAG: true,
    };
  }
  // More specific substitution pattern to avoid matching troubleshooting
  if (
    lower.match(
      /(can i|could i|should i).*(use|substitute|replace|swap)|instead of (a|an|the)|substitute for|replace (the|a|an)|swap (the|a|an)|without (the|a|an)|don't have (the|a|an)|alternative to/
    )
  ) {
    return {
      type: "substitution_request",
      confidence: 0.9,
      requiresContext: true,
      requiresRAG: true,
    };
  }
  if (
    lower.match(
      /what (is|are|does).*ingredient|which ingredient|about.*ingredient|what (is|are|does) (the |this |that )?\w+ (do|for|used)/
    )
  ) {
    return {
      type: "ingredient_question",
      confidence: 0.85,
      requiresContext: true,
      requiresRAG: false,
    };
  }
  if (
    lower.match(
      /double|half|triple|scale|serve|serving|portion|make (more|less)/
    )
  ) {
    return {
      type: "scaling_question",
      confidence: 0.85,
      requiresContext: true,
      requiresRAG: false,
    };
  }
  if (
    lower.match(
      /what does.*mean|explain|clarify|don't understand|confused|step/
    )
  ) {
    return {
      type: "step_clarification",
      confidence: 0.8,
      requiresContext: true,
      requiresRAG: true,
    };
  }
  if (
    lower.match(
      /how to|how do i|what does.*mean|technique|method|process|what is|define/
    )
  ) {
    return {
      type: "technique_question",
      confidence: 0.8,
      requiresContext: false,
      requiresRAG: true,
    };
  }
  if (lower.match(/i (used|added|changed|substituted|made|did|skipped)/)) {
    return {
      type: "modification_report",
      confidence: 0.85,
      requiresContext: true,
      requiresRAG: false,
    };
  }
  if (lower.match(/i (like|prefer|love|hate|don't like|always|never)/)) {
    return {
      type: "preference_statement",
      confidence: 0.9,
      requiresContext: false,
      requiresRAG: false,
    };
  }
  // Future preferences/plans - lower confidence triggers confirmation modal
  if (
    lower.match(
      /i('ll| will| want to| should| might| could) (try|use|add|make|do|skip)/
    ) ||
    lower.match(/next time|from now on|in the future|going to/)
  ) {
    return {
      type: "preference_statement",
      confidence: 0.7, // Lower confidence → shows confirmation modal
      requiresContext: false,
      requiresRAG: false,
    };
  }

  return {
    type: "simple_question",
    confidence: 0.6,
    requiresContext: true,
    requiresRAG: false,
  };
}

function selectModel(intent: any): keyof typeof MODELS {
  if (intent.confidence < 0.7) return "GPT4O_MINI";

  switch (intent.type) {
    case "timing_question":
    case "temperature_question":
    case "simple_question":
    case "modification_report":
    case "preference_statement":
    case "timer_command":
      return "GEMINI_FLASH";
    case "substitution_request":
    case "ingredient_question":
    case "technique_question":
    case "scaling_question":
    case "step_clarification":
      return "GPT4O_MINI";
    case "troubleshooting":
      return "CLAUDE_SONNET_4";
    default:
      return "GEMINI_FLASH";
  }
}

function buildSystemPrompt(
  intent: any,
  model: keyof typeof MODELS,
  stepNumber: number,
  hasMemoryContext: boolean = false
): string {
  const memoryNote = hasMemoryContext
    ? ` You remember this cook's preferences, past substitutions, and cooking notes from previous sessions — use them naturally without over-explaining.`
    : ` You learn and remember each cook's preferences, substitutions, and decisions over time. If you don't have specific history yet, that's fine — just help them cook.`;
  const basePrompt = `You are Chez, a personal cooking assistant.${memoryNote} Answer concisely and directly.`;

  if (model === "GEMINI_FLASH") {
    switch (intent.type) {
      case "timing_question":
        return `${basePrompt} Answer timing questions based on the recipe step.`;
      case "temperature_question":
        return `${basePrompt} Answer temperature questions based on the recipe step.`;
      case "simple_question":
        return `${basePrompt} Answer simple questions about quantities or measurements.`;
      case "modification_report":
        return `${basePrompt} Acknowledge the user's modification briefly.`;
      case "preference_statement":
        return `${basePrompt} Acknowledge the user's preference warmly.`;
      default:
        return basePrompt;
    }
  }

  if (model === "GPT4O_MINI") {
    switch (intent.type) {
      case "substitution_request":
        return `${basePrompt} Suggest appropriate ingredient substitutions considering flavor, texture, and cooking properties.`;
      case "ingredient_question":
        return `${basePrompt} Explain the ingredient's role in this recipe.`;
      case "technique_question":
        return `${basePrompt} Explain cooking techniques clearly with practical tips.`;
      case "scaling_question":
        return `${basePrompt} Help scale the recipe proportionally, noting any adjustments for cooking time or method.`;
      case "step_clarification":
        return `${basePrompt} Clarify the recipe step with additional context if needed.`;
      case "modification_report":
        return `${basePrompt} Acknowledge the user's modification briefly.`;
      case "preference_statement":
        return `${basePrompt} Acknowledge the user's preference warmly.`;
      default:
        return basePrompt;
    }
  }

  if (model === "CLAUDE_SONNET_4") {
    switch (intent.type) {
      case "troubleshooting":
        return `${basePrompt} Help diagnose and solve cooking problems. Consider what went wrong, why it happened, and how to fix it or prevent it next time. Be encouraging and practical.`;
      case "modification_report":
        return `${basePrompt} Acknowledge the user's modification thoughtfully.`;
      case "preference_statement":
        return `${basePrompt} Acknowledge the user's preference warmly.`;
      default:
        return `${basePrompt} Provide thoughtful, detailed guidance for this cooking question.`;
    }
  }

  return basePrompt;
}

// ============================================================================
// MAIN EDGE FUNCTION
// ============================================================================

type LearningType =
  | "substitution"
  | "preference"
  | "timing"
  | "technique"
  | "addition"
  | "modification"
  | "tip";

interface DetectedLearning {
  type: LearningType;
  original: string | null;
  modification: string;
  context: string;
  step_number: number;
  detected_at: string;
  confidence: number; // 0-1, >=0.8 auto-save, <0.8 show confirmation modal
}

function mapLearningTypeToLabel(type: LearningType): string {
  switch (type) {
    case "substitution":
      return "substitution_used";
    case "preference":
      return "preference_expressed";
    case "timing":
      return "doneness_preference";
    case "technique":
      return "technique_learned";
    case "addition":
      return "modification_made";
    case "modification":
      return "modification_made";
    case "tip":
      return "technique_learned"; // tips are learned techniques/best practices
    default:
      return "modification_made";
  }
}

/**
 * Safely extract learning from AI response
 * Looks for ---LEARNING--- blocks first, then falls back to JSON extraction
 * Default confidence for AI-extracted learnings is 0.75 (medium confidence)
 */
function extractLearning(
  responseText: string,
  stepNumber: number
): DetectedLearning | null {
  try {
    // Look for learning block markers
    const learningMatch = responseText.match(
      /---LEARNING---\s*([\s\S]*?)\s*---END LEARNING---/
    );
    if (learningMatch) {
      const parsed = JSON.parse(learningMatch[1]);
      // step_number is optional - we use the passed stepNumber as fallback
      if (
        parsed.type &&
        parsed.modification &&
        parsed.context &&
        parsed.detected_at
      ) {
        return {
          ...parsed,
          // Use AI-provided confidence or default to 0.75 (medium)
          confidence: parsed.confidence ?? 0.75,
          // Use AI-provided step_number or fallback to current step
          step_number: parsed.step_number ?? stepNumber,
        } as DetectedLearning;
      }
    }

    // Fallback: Look for JSON object with required fields
    const jsonMatch = responseText.match(
      /\{[\s\S]*"type"[\s\S]*"detected_at"[\s\S]*\}/
    );
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // step_number is optional - we use the passed stepNumber as fallback
      if (
        parsed.type &&
        parsed.modification &&
        parsed.context &&
        parsed.detected_at
      ) {
        return {
          ...parsed,
          // Use AI-provided confidence or default to 0.75 (medium)
          confidence: parsed.confidence ?? 0.75,
          // Use AI-provided step_number or fallback to current step
          step_number: parsed.step_number ?? stepNumber,
        } as DetectedLearning;
      }
    }

    return null;
  } catch (error) {
    console.warn("Failed to parse learning from response:", error);
    return null;
  }
}

/**
 * Clean learning markers from response text
 */
function cleanLearningMarkers(text: string): string {
  return text.replace(/---LEARNING---[\s\S]*?---END LEARNING---/g, "").trim();
}

/**
 * Generate embedding for text using OpenAI
 */
async function generateEmbedding(
  text: string,
  openaiApiKey: string
): Promise<number[] | null> {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.data[0].embedding;
    }
  } catch (error) {
    console.warn("Failed to generate embedding:", error);
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    const keyValidation = validateApiKeys(openrouterApiKey, anthropicApiKey);
    if (!keyValidation.valid) {
      return new Response(
        JSON.stringify({
          error: "Configuration error: " + keyValidation.errors.join(", "),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      message,
      session_id,
      step_number: requestStepNumber,
      version_id: requestVersionId,
    } = await req.json();

    if (!message || !session_id) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: message, session_id",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session, error: sessionError } = await supabase
      .from("cook_sessions")
      .select(
        "id, master_recipe_id, version_id, current_step, is_complete, completed_steps"
      )
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      console.error("Session query failed:", sessionError, "Session:", session);
      return new Response(
        JSON.stringify({
          error: "Cook session not found",
          debug: {
            session_id,
            user_id: user.id,
            error: sessionError?.message,
            code: sessionError?.code,
          },
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Query master recipe
    const { data: masterRecipe, error: recipeError } = await supabase
      .from("master_recipes")
      .select("id, title, mode, current_version_id")
      .eq("id", session.master_recipe_id)
      .single();

    if (recipeError || !masterRecipe) {
      return new Response(JSON.stringify({ error: "Recipe not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get version data (steps and ingredients are stored as JSONB)
    let recipeSteps: Array<{ step_number: number; instruction: string }> = [];
    let recipeIngredients: Array<{
      quantity: string;
      unit: string;
      item: string;
      preparation?: string;
    }> = [];

    // Version precedence: request_version_id -> session.version_id -> current_version_id
    // All candidates validated to belong to this recipe AND version_number IN (1, 2)
    let versionId: string | null = null;
    const versionCandidates = [
      requestVersionId,
      session.version_id,
      masterRecipe.current_version_id,
    ].filter(Boolean);

    for (const candidateId of versionCandidates) {
      const { data: validVersion } = await supabase
        .from("master_recipe_versions")
        .select("id")
        .eq("id", candidateId)
        .eq("master_recipe_id", masterRecipe.id)
        .in("version_number", [1, 2])
        .single();
      if (validVersion) {
        versionId = validVersion.id;
        break;
      }
    }
    if (versionId) {
      const { data: versionData } = await supabase
        .from("master_recipe_versions")
        .select("id, ingredients, steps")
        .eq("id", versionId)
        .single();

      if (versionData) {
        recipeSteps = (versionData.steps as typeof recipeSteps) || [];
        recipeIngredients =
          (versionData.ingredients as typeof recipeIngredients) || [];
      }
    }

    // Build recipe object for compatibility
    const recipe = {
      id: masterRecipe.id,
      title: masterRecipe.title,
      mode: masterRecipe.mode,
      recipe_steps: recipeSteps,
      recipe_ingredients: recipeIngredients,
    };

    // Read tier from user_rate_limits (canonical source, not blocked by trigger)
    const { data: rateLimitData } = await supabase
      .from("user_rate_limits")
      .select("tier")
      .eq("user_id", user.id)
      .single();

    const dbTier = rateLimitData?.tier === "chef" ? "chef" : "free";

    // Verify with RevenueCat if database says free (catches webhook delays)
    const userTier = await verifyAndSyncTier(user.id, dbTier, supabase);

    // Rate limiting enabled: Free tier = 20 msgs/day, Chef tier = 500 msgs/day
    const { data: rateLimitResult, error: rateLimitError } = await supabase.rpc(
      "check_rate_limit",
      {
        p_user_id: user.id,
        p_tier: userTier,
      }
    );

    if (rateLimitError) {
      console.error("Rate limit check failed:", rateLimitError);
      return new Response(
        JSON.stringify({
          error: "Internal rate limit check failed",
          details: "Database rate limiting system encountered an error",
          code: "RATE_LIMIT_CHECK_FAILED",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (rateLimitResult && !rateLimitResult.allowed) {
      console.log("🚫 Rate limit exceeded:", {
        user_id: user.id,
        tier: userTier,
        current: rateLimitResult.current,
        limit: rateLimitResult.limit,
      });
      return new Response(
        JSON.stringify({
          error: `Daily message limit reached (${rateLimitResult.current}/${rateLimitResult.limit})`,
          details: `You've used all ${rateLimitResult.limit} messages for today. ${userTier === "free" ? "Upgrade to Chef tier for 500 messages/day." : "Limit resets at midnight."}`,
          code: "RATE_LIMIT_EXCEEDED",
          tier: userTier,
          limit: rateLimitResult.limit,
          current: rateLimitResult.current,
          remaining: rateLimitResult.remaining,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use the visible step (what user is looking at) for context
    const stepNumber = requestStepNumber || session.current_step || 1;
    const totalSteps = recipe.recipe_steps?.length || 1;

    const currentStepData = recipe.recipe_steps?.find(
      (s: any) => s.step_number === stepNumber
    );

    const ingredients =
      recipe.recipe_ingredients?.map((i: any) =>
        `${i.quantity || ""} ${i.unit || ""} ${i.item}${i.preparation ? ` (${i.preparation})` : ""}`.trim()
      ) || [];

    // Simple context: recipe + current step + ingredients
    const contextText = `Recipe: ${recipe.title}\nStep ${stepNumber}/${totalSteps}: ${currentStepData?.instruction || ""}\nIngredients: ${ingredients.join(", ")}`;

    const { data: recentMessages } = await supabase
      .from("cook_session_messages")
      .select("role, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(6);

    const conversationHistory =
      recentMessages?.reverse().map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })) || [];

    const intent = classifyIntent(message);
    const modelKey = selectModel(intent);

    // Always fetch user memory (core value prop), gate recipe knowledge by intent.requiresRAG
    let ragContext = "";
    if (openaiApiKey && openaiApiKey.trim() !== "") {
      try {
        const embeddingResponse = await fetch(
          "https://api.openai.com/v1/embeddings",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              input: message,
              model: "text-embedding-3-small",
            }),
          }
        );

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const embedding = embeddingData.data[0].embedding;

          // Always fetch user cooking memory (preferences, past modifications, allergies)
          const { data: memoryResults } = await supabase.rpc(
            "match_user_memory",
            {
              p_user_id: user.id,
              query_embedding: JSON.stringify(embedding),
              match_threshold: 0.5,
              match_count: 3,
            }
          );

          // Only fetch recipe knowledge for intents that need it
          let knowledgeResults = null;
          if (intent.requiresRAG) {
            const { data } = await supabase.rpc("match_recipe_knowledge", {
              query_embedding: embedding,
              match_threshold: 0.7,
              match_count: 3,
            });
            knowledgeResults = data;
          }

          // Combine both sources
          const allDocs = [
            ...(memoryResults || []).map((d: any) => ({
              content: d.content,
              source: "Your Cooking History",
            })),
            ...(knowledgeResults || []).map((d: any) => ({
              content: d.content,
              source: "Chef AI Knowledge",
            })),
          ];

          if (allDocs.length > 0) {
            ragContext = allDocs
              .map((d: any) => `[${d.source}]\n${d.content}`)
              .join("\n\n");
          }
        }
      } catch (ragError) {
        console.warn("RAG fetch failed, continuing without:", ragError);
      }
    }

    // Build system prompt after RAG so we know if memory context exists
    const hasMemoryContext = ragContext.includes("Your Cooking History");
    const systemPrompt = buildSystemPrompt(
      intent,
      modelKey,
      stepNumber,
      hasMemoryContext
    );

    const messages = buildMessages(
      systemPrompt,
      message,
      ragContext ? `${contextText}\n\nKnowledge:\n${ragContext}` : contextText,
      conversationHistory,
      3000 // Input token budget
    );

    let aiResponse;
    let usedFallback = false;

    try {
      const maxTokens = MODELS[modelKey].maxTokens;
      aiResponse = await callOpenRouter(
        modelKey,
        messages,
        openrouterApiKey!,
        maxTokens
      );
      aiResponse = {
        ...aiResponse,
        intent: intent.type,
      };
    } catch (routerError) {
      console.warn("Router failed, using Claude fallback:", routerError);
      usedFallback = true;

      // FIX: Pass modelKey for tier-appropriate max_tokens
      const fallbackResponse = await callClaudeFallback(
        messages,
        anthropicApiKey!,
        modelKey
      );
      aiResponse = {
        ...fallbackResponse,
        intent: "fallback",
      };
    }

    let responseText = aiResponse.response || aiResponse.content;

    // Learning detection - CHEF TIER ONLY
    // Free users don't get learning detection (it's a premium feature)
    let detectedLearning: DetectedLearning | null = null;

    if (userTier === "chef") {
      // FIX: Direct memory creation for explicit intents
      // Use intent confidence to determine learning confidence:
      // - High intent confidence (>=0.85) → high learning confidence (0.95) → auto-save
      // - Lower intent confidence (<0.85) → lower learning confidence → shows confirmation modal
      if (
        intent.type === "preference_statement" ||
        intent.type === "modification_report"
      ) {
        const learningConfidence =
          intent.confidence >= 0.85 ? 0.95 : intent.confidence;
        detectedLearning = {
          type:
            intent.type === "preference_statement"
              ? "preference"
              : "modification",
          original: null,
          modification: message.trim(),
          context: message.substring(0, 100).trim(),
          step_number: stepNumber,
          detected_at: new Date().toISOString(),
          confidence: learningConfidence,
        };
      } else {
        // Fallback: AI-suggested learning for discovered patterns (medium confidence)
        detectedLearning = extractLearning(responseText, stepNumber);
        responseText = cleanLearningMarkers(responseText);
      }
    } else {
      // Free tier: still clean any learning markers from response, just don't detect
      responseText = cleanLearningMarkers(responseText);
    }

    // Voice response = full text (models already cap at maxTokens, prompt says "concise")
    const voiceResponse = responseText;

    const { data: savedMessage, error: saveError } = await supabase
      .from("cook_session_messages")
      .insert({
        session_id: session_id,
        role: "user",
        content: message,
      })
      .select("id")
      .single();

    if (!saveError && savedMessage) {
      await supabase.from("cook_session_messages").insert({
        session_id: session_id,
        role: "assistant",
        content: responseText,
      });
    }

    // Only auto-persist HIGH confidence learnings (>=0.8)
    // Low confidence learnings are returned but NOT saved - frontend shows confirm modal first
    let learningWasSaved = false;
    if (detectedLearning && detectedLearning.confidence >= 0.8) {
      try {
        // Append to session's detected_learnings array
        await supabase.rpc("append_detected_learning", {
          p_session_id: session_id,
          p_user_id: user.id,
          p_learning: detectedLearning,
        });

        // Create user_cooking_memory entry for RAG
        const memoryContent = detectedLearning.context;
        const memoryType =
          detectedLearning.type === "preference"
            ? "preference"
            : "cooking_note";
        const memoryLabel = mapLearningTypeToLabel(detectedLearning.type);

        const { data: memoryData, error: memoryError } = await supabase
          .from("user_cooking_memory")
          .insert({
            user_id: user.id,
            content: memoryContent,
            memory_type: memoryType,
            source_session_id: session_id,
            source_message_id: savedMessage?.id ?? null,
            label: memoryLabel,
            metadata: {
              master_recipe_id: recipe.id,
              recipe_title: recipe.title,
              learning_type: detectedLearning.type,
              original: detectedLearning.original,
              modification: detectedLearning.modification,
              step_number: detectedLearning.step_number,
            },
          })
          .select("id")
          .single();

        // Only mark as saved if insert succeeded
        if (memoryError || !memoryData) {
          console.error("Failed to save learning to memory:", memoryError);
        } else {
          // Generate and store embedding when available
          if (openaiApiKey && openaiApiKey.trim() !== "") {
            const embedding = await generateEmbedding(
              memoryContent,
              openaiApiKey
            );
            if (embedding) {
              await supabase
                .from("user_cooking_memory")
                .update({ embedding })
                .eq("id", memoryData.id);
            }
          }
          learningWasSaved = true;
          console.log("✅ High-confidence learning auto-saved:", memoryLabel);
        }
      } catch (learningError) {
        console.error("Failed to save learning:", learningError);
      }
    } else if (detectedLearning) {
      console.log(
        "⏳ Low-confidence learning returned for user confirmation:",
        detectedLearning.confidence,
        detectedLearning.type
      );
    }

    try {
      await supabase.from("ai_cost_logs").insert({
        user_id: user.id,
        session_id: session_id,
        operation: "cook_chat",
        model: aiResponse.model,
        provider: aiResponse.provider,
        intent: aiResponse.intent,
        prompt_tokens: aiResponse.promptTokens,
        completion_tokens: aiResponse.completionTokens,
        cost_usd: aiResponse.cost,
        latency_ms: aiResponse.latency || aiResponse.latencyMs,
      });
    } catch (costLogError) {
      console.error("Failed to log cost:", costLogError);
    }

    // FIX: Add v1-compatible fields for UI backwards compatibility
    return new Response(
      JSON.stringify({
        response: responseText,
        voice_response: voiceResponse,
        intent: aiResponse.intent,
        message_id: savedMessage?.id,
        learning_saved: learningWasSaved,
        detected_learning: detectedLearning,
        // V1 compatibility fields
        suggest_complete_step: false,
        complete_all_steps: false,
        complete_steps: [],
        suggested_next_step: null,
        // V2 metadata
        _metadata: {
          model: aiResponse.model,
          provider: aiResponse.provider,
          cost: aiResponse.cost,
          latency: aiResponse.latency || aiResponse.latencyMs,
          step: stepNumber,
          fallback: usedFallback,
          rag_used: intent.requiresRAG && ragContext.length > 0,
        },
        // Rate limit info for proactive warnings
        rate_limit: rateLimitResult
          ? {
              current: rateLimitResult.current,
              limit: rateLimitResult.limit,
              remaining: rateLimitResult.remaining,
              tier: userTier,
            }
          : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Cook chat error:", error);
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
