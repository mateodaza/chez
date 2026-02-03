/**
 * Smart AI Routing Layer
 * Routes cooking chat requests to cost-appropriate models based on intent
 * Target: 70% cost reduction through intelligent model selection
 */

import {
  callOpenRouter,
  buildMessages,
  MODELS,
  truncateContext,
  estimateTokens,
} from "./openrouter.ts";
import type { OpenRouterResponse } from "./openrouter.ts";

export interface CookingContext {
  sessionId: string;
  recipeId: string;
  recipeName: string;
  currentStep: number;
  currentStepText: string;
  ingredients: string[];
  totalSteps: number;
}

export interface Intent {
  type:
    | "timing_question"
    | "temperature_question"
    | "simple_question"
    | "substitution_request"
    | "ingredient_question"
    | "technique_question"
    | "scaling_question"
    | "step_clarification"
    | "troubleshooting"
    | "modification_report"
    | "preference_statement"
    | "timer_command";
  confidence: number;
  requiresContext: boolean;
  requiresRAG: boolean;
}

export interface RAGContext {
  recipeKnowledge: Array<{ content: string; source: string }>;
  userMemory: Array<{ content: string; source: string }>;
}

export interface RouteResult {
  model: string;
  provider: string;
  response: string;
  cost: number;
  latency: number;
  intent: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Classify user intent using pattern matching (no API cost)
 * Enhanced from original router with better patterns
 */
export function classifyIntent(message: string): Intent {
  const lower = message.toLowerCase().trim();

  // Timer commands (may handle locally)
  if (lower.match(/^(start|stop|pause|resume|set|cancel)\s+(timer|alarm)/)) {
    return {
      type: "timer_command",
      confidence: 0.98,
      requiresContext: false,
      requiresRAG: false,
    };
  }

  // Timing questions
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

  // Temperature questions
  if (lower.match(/temperature|degrees|temp|how hot|how cold|oven|heat/)) {
    return {
      type: "temperature_question",
      confidence: 0.95,
      requiresContext: true,
      requiresRAG: false,
    };
  }

  // Simple quantity questions
  if (lower.match(/how much|quantity|amount|measurement/)) {
    return {
      type: "simple_question",
      confidence: 0.9,
      requiresContext: true,
      requiresRAG: false,
    };
  }

  // Substitution requests
  if (
    lower.match(
      /instead of|substitute|replace|swap|use.*instead|without|don't have|alternative/
    )
  ) {
    return {
      type: "substitution_request",
      confidence: 0.9,
      requiresContext: true,
      requiresRAG: true, // May need ingredient knowledge
    };
  }

  // Ingredient questions
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

  // Scaling questions
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

  // Step clarification
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

  // Technique questions
  if (
    lower.match(
      /how to|how do i|what does.*mean|technique|method|process|what is|define/
    )
  ) {
    return {
      type: "technique_question",
      confidence: 0.8,
      requiresContext: false,
      requiresRAG: true, // Need cooking knowledge
    };
  }

  // Modification reports (user stating what they did differently)
  if (lower.match(/i (used|added|changed|substituted|made|did|skipped)/)) {
    return {
      type: "modification_report",
      confidence: 0.85,
      requiresContext: true,
      requiresRAG: false,
    };
  }

  // Preference statements
  if (lower.match(/i (like|prefer|love|hate|don't like|always|never)/)) {
    return {
      type: "preference_statement",
      confidence: 0.9,
      requiresContext: false,
      requiresRAG: false,
    };
  }

  // Troubleshooting (complex!)
  if (
    lower.match(
      /went wrong|not working|help|problem|issue|fix|broken|burnt|raw|overcooked|undercooked|why (is|did)/
    )
  ) {
    return {
      type: "troubleshooting",
      confidence: 0.85,
      requiresContext: true,
      requiresRAG: true, // Need full context + knowledge
    };
  }

  // Default to simple question
  return {
    type: "simple_question",
    confidence: 0.6,
    requiresContext: true,
    requiresRAG: false,
  };
}

/**
 * Select appropriate model tier based on intent
 * With confidence-based escalation
 */
export function selectModel(intent: Intent): keyof typeof MODELS {
  // Escalate to higher tier if confidence is low
  if (intent.confidence < 0.7) {
    return "GPT4O_MINI"; // Medium tier for uncertain classification
  }

  switch (intent.type) {
    // Tier 1: Gemini Flash (70% of traffic, cheapest)
    case "timing_question":
    case "temperature_question":
    case "simple_question":
    case "modification_report":
    case "preference_statement":
    case "timer_command":
      return "GEMINI_FLASH";

    // Tier 2: GPT-4o-mini (25% of traffic, medium cost)
    case "substitution_request":
    case "ingredient_question":
    case "technique_question":
    case "scaling_question":
    case "step_clarification":
      return "GPT4O_MINI";

    // Tier 3: Claude Sonnet 4 (5% of traffic, highest quality)
    case "troubleshooting":
      return "CLAUDE_SONNET_4";

    default:
      return "GEMINI_FLASH"; // Default to cheapest
  }
}

/**
 * Build minimal context based on intent
 * Token optimization: only include what's needed
 */
export function buildMinimalContext(
  context: CookingContext,
  intent: Intent,
  ragContext?: RAGContext
): string {
  const parts: string[] = [];

  // For simple questions, only current step
  if (
    intent.type === "timing_question" ||
    intent.type === "temperature_question"
  ) {
    parts.push(
      `Step ${context.currentStep}/${context.totalSteps}: ${context.currentStepText}`
    );
    return parts.join("\n");
  }

  // For substitutions, include ingredients
  if (intent.type === "substitution_request") {
    parts.push(`Recipe: ${context.recipeName}`);
    parts.push(`Ingredients: ${context.ingredients.join(", ")}`);
    parts.push(`Current step: ${context.currentStepText}`);
    return parts.join("\n");
  }

  // For scaling, include ingredients and servings info
  if (intent.type === "scaling_question") {
    parts.push(`Recipe: ${context.recipeName}`);
    parts.push(`Ingredients: ${context.ingredients.join(", ")}`);
    return parts.join("\n");
  }

  // For technique questions, minimal context (rely on RAG)
  if (intent.type === "technique_question") {
    if (ragContext?.recipeKnowledge && ragContext.recipeKnowledge.length > 0) {
      const knowledge = ragContext.recipeKnowledge
        .slice(0, 3) // Max 3 knowledge chunks
        .map((k) => k.content)
        .join("\n\n");
      parts.push(`Cooking Knowledge:\n${knowledge}`);
    }
    return parts.join("\n");
  }

  // For troubleshooting, full context + RAG
  if (intent.type === "troubleshooting") {
    parts.push(`Recipe: ${context.recipeName}`);
    parts.push(`Current step: ${context.currentStep}/${context.totalSteps}`);
    parts.push(`Step instruction: ${context.currentStepText}`);
    parts.push(`Ingredients: ${context.ingredients.join(", ")}`);

    // Add RAG context if available
    if (ragContext?.recipeKnowledge && ragContext.recipeKnowledge.length > 0) {
      const knowledge = ragContext.recipeKnowledge
        .slice(0, 3)
        .map((k) => k.content)
        .join("\n\n");
      parts.push(`\nRelevant Knowledge:\n${knowledge}`);
    }

    if (ragContext?.userMemory && ragContext.userMemory.length > 0) {
      const memory = ragContext.userMemory
        .slice(0, 2) // Max 2 memory chunks
        .map((m) => m.content)
        .join("\n\n");
      parts.push(`\nUser Preferences:\n${memory}`);
    }

    return parts.join("\n");
  }

  // For step clarification, current step + RAG
  if (intent.type === "step_clarification") {
    parts.push(`Recipe: ${context.recipeName}`);
    parts.push(`Step ${context.currentStep}: ${context.currentStepText}`);

    if (ragContext?.recipeKnowledge && ragContext.recipeKnowledge.length > 0) {
      const knowledge = ragContext.recipeKnowledge
        .slice(0, 2)
        .map((k) => k.content)
        .join("\n\n");
      parts.push(`\nBackground:\n${knowledge}`);
    }

    return parts.join("\n");
  }

  // For modification reports and preferences, minimal context
  if (
    intent.type === "modification_report" ||
    intent.type === "preference_statement"
  ) {
    parts.push(`Recipe: ${context.recipeName}`);
    if (context.currentStepText) {
      parts.push(`Current step: ${context.currentStepText}`);
    }
    return parts.join("\n");
  }

  // Default: current step only
  parts.push(`Step ${context.currentStep}: ${context.currentStepText}`);
  return parts.join("\n");
}

/**
 * Build system prompt based on intent and model tier
 */
export function buildSystemPrompt(
  intent: Intent,
  model: keyof typeof MODELS
): string {
  // Base prompt for all models
  const basePrompt = `You are a helpful cooking assistant. Answer concisely and directly.`;

  // Tier 1 (Gemini Flash): Ultra-concise prompts
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

  // Tier 2 (GPT-4o-mini): Medium detail prompts
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

  // Tier 3 (Claude Sonnet 4): Full detail prompts
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

/**
 * Build complete prompt for model
 * Applies token budgeting
 */
export function buildPrompt(
  message: string,
  context: CookingContext,
  intent: Intent,
  model: keyof typeof MODELS,
  ragContext?: RAGContext,
  history?: Array<{ role: "user" | "assistant"; content: string }>
): {
  system: string;
  context: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  // Build system prompt
  const systemPrompt = buildSystemPrompt(intent, model);

  // Build minimal context
  let contextText = buildMinimalContext(context, intent, ragContext);

  // Apply token budget (estimate and truncate if needed)
  const modelConfig = MODELS[model];
  const maxContextTokens = Math.floor(modelConfig.maxTokens * 0.4); // 40% for context
  const contextTokens = estimateTokens(contextText);

  if (contextTokens > maxContextTokens) {
    contextText = truncateContext(contextText, maxContextTokens);
  }

  // Limit history to last 6 messages for token budget
  const recentHistory = history?.slice(-6) || [];

  return {
    system: systemPrompt,
    context: contextText,
    messages: recentHistory,
  };
}

/**
 * Main routing function
 * Routes request to appropriate model with fallback
 */
export async function routeChatRequest(
  message: string,
  context: CookingContext,
  ragContext: RAGContext | undefined,
  history: Array<{ role: "user" | "assistant"; content: string }> | undefined,
  apiKey: string
): Promise<RouteResult> {
  const startTime = Date.now();

  // 1. Classify intent (free, local pattern matching)
  const intent = classifyIntent(message);

  // 2. Select appropriate model based on intent
  const modelKey = selectModel(intent);

  // 3. Build optimized prompt
  const {
    system,
    context: contextText,
    messages: historyMessages,
  } = buildPrompt(message, context, intent, modelKey, ragContext, history);

  // 4. Build messages for OpenRouter
  const messages = buildMessages(system, message, contextText, historyMessages);

  // 5. Call OpenRouter with selected model
  try {
    const response: OpenRouterResponse = await callOpenRouter(
      {
        model: modelKey,
        messages,
        temperature: 0.7,
      },
      apiKey
    );

    return {
      model: response.model,
      provider: response.provider,
      response: response.content,
      cost: response.cost,
      latency: response.latencyMs,
      intent: intent.type,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
    };
  } catch (error) {
    // Fallback will be handled by calling function (cook-chat-v2)
    throw error;
  }
}
