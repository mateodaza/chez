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
    id: "google/gemini-flash-1.5",
    promptCost: 0.1,
    completionCost: 0.3,
    maxTokens: 8000,
    timeoutMs: 10000,
  },
  GROQ_LLAMA_70B: {
    id: "groq/llama-3.1-70b-versatile",
    promptCost: 0.59,
    completionCost: 0.79,
    maxTokens: 8000,
    timeoutMs: 10000,
  },
  GPT4O_MINI: {
    id: "openai/gpt-4o-mini",
    promptCost: 0.15,
    completionCost: 0.6,
    maxTokens: 16000,
    timeoutMs: 15000,
  },
  CLAUDE_SONNET_4: {
    id: "anthropic/claude-sonnet-4-20250514",
    promptCost: 3.0,
    completionCost: 15.0,
    maxTokens: 16000,
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
  retries = 2
) {
  const config = MODELS[model];
  const startTime = Date.now();

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
            max_tokens: config.maxTokens,
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

function buildMessages(
  systemPrompt: string,
  userMessage: string,
  context?: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: systemPrompt }];

  if (context) {
    messages.push({ role: "system", content: `Context:\n${context}` });
  }

  if (history && history.length > 0) {
    messages.push(...history.slice(-6));
  }

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
  anthropicApiKey: string
) {
  const startTime = Date.now();

  const client = new Anthropic({ apiKey: anthropicApiKey });

  const systemMessage =
    messages.find((m) => m.role === "system")?.content ||
    "You are a helpful cooking assistant.";
  const conversationMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
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
  if (
    lower.match(
      /instead of|substitute|replace|swap|use.*instead|without|don't have|alternative/
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
    lower.match(/what (is|are).*ingredient|which ingredient|about.*ingredient/)
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
  if (
    lower.match(
      /went wrong|not working|help|problem|issue|fix|broken|burnt|raw|overcooked|undercooked|why (is|did)/
    )
  ) {
    return {
      type: "troubleshooting",
      confidence: 0.85,
      requiresContext: true,
      requiresRAG: true,
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

function buildSystemPrompt(intent: any, model: keyof typeof MODELS): string {
  const basePrompt = `You are a helpful cooking assistant. Answer concisely and directly.`;

  if (model === "GEMINI_FLASH") {
    switch (intent.type) {
      case "timing_question":
        return `${basePrompt} Answer timing questions based on the recipe step.`;
      case "temperature_question":
        return `${basePrompt} Answer temperature questions based on the recipe step.`;
      case "simple_question":
        return `${basePrompt} Answer simple questions about quantities or measurements.`;
      case "modification_report":
        return `${basePrompt} Acknowledge the user's modification and note it for learning.`;
      case "preference_statement":
        return `${basePrompt} Acknowledge the user's preference and note it for learning.`;
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
      default:
        return basePrompt;
    }
  }

  if (model === "CLAUDE_SONNET_4") {
    switch (intent.type) {
      case "troubleshooting":
        return `${basePrompt} Help diagnose and solve cooking problems. Consider what went wrong, why it happened, and how to fix it or prevent it next time. Be encouraging and practical.`;
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
  | "addition";

interface DetectedLearning {
  type: LearningType;
  original: string | null;
  modification: string;
  context: string;
  step_number: number;
  detected_at: string;
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

    const { message, session_id } = await req.json();

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
        `
        id,
        recipe_id,
        current_step,
        status,
        completed_steps,
        master_recipes (
          id,
          title,
          mode,
          recipe_steps (step_number, instruction),
          recipe_ingredients (quantity, unit, item, preparation)
        )
      `
      )
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Cook session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipe = session.master_recipes as any;
    if (!recipe) {
      return new Response(JSON.stringify({ error: "Recipe not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const userTier = userData?.subscription_tier === "chef" ? "chef" : "free";

    const { data: rateLimitResult, error: rateLimitError } = await supabase.rpc(
      "check_rate_limit",
      {
        p_user_id: user.id,
        p_tier: userTier,
      }
    );

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
    } else if (rateLimitResult && !rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
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

    const stepNumber = session.current_step || 1;
    const totalSteps = recipe.recipe_steps?.length || 1;
    const currentStepData = recipe.recipe_steps?.find(
      (s: any) => s.step_number === stepNumber
    );
    const ingredients =
      recipe.recipe_ingredients?.map((i: any) =>
        `${i.quantity || ""} ${i.unit || ""} ${i.item}${i.preparation ? ` (${i.preparation})` : ""}`.trim()
      ) || [];

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
    const systemPrompt = buildSystemPrompt(intent, modelKey);
    const messages = buildMessages(
      systemPrompt,
      message,
      contextText,
      conversationHistory
    );

    let aiResponse;
    let usedFallback = false;

    try {
      aiResponse = await callOpenRouter(modelKey, messages, openrouterApiKey!);
      aiResponse = {
        ...aiResponse,
        intent: intent.type,
      };
    } catch (routerError) {
      console.warn("Router failed, using Claude fallback:", routerError);
      usedFallback = true;

      const fallbackResponse = await callClaudeFallback(
        messages,
        anthropicApiKey!
      );
      aiResponse = {
        ...fallbackResponse,
        intent: "fallback",
      };
    }

    let responseText = aiResponse.response || aiResponse.content;
    let voiceResponse = responseText.slice(0, 150);

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

    return new Response(
      JSON.stringify({
        response: responseText,
        voice_response: voiceResponse,
        intent: aiResponse.intent,
        message_id: savedMessage?.id,
        _metadata: {
          model: aiResponse.model,
          provider: aiResponse.provider,
          cost: aiResponse.cost,
          latency: aiResponse.latency || aiResponse.latencyMs,
          fallback: usedFallback,
        },
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
