/**
 * Fallback Handler for OpenRouter Failures
 * Falls back to direct Claude API when OpenRouter is unavailable
 * Ensures reliability at the cost of losing multi-model routing
 */

import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";

export interface FallbackResponse {
  response: string;
  cost: number;
  latency: number;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  fallback: true;
}

/**
 * Calculate Claude Sonnet 4 cost
 * Based on $3/1M input, $15/1M output tokens
 */
function calculateClaudeCost(
  promptTokens: number,
  completionTokens: number
): number {
  const promptCost = (promptTokens / 1_000_000) * 3.0;
  const completionCost = (completionTokens / 1_000_000) * 15.0;
  return promptCost + completionCost;
}

/**
 * Call Claude directly via Anthropic SDK
 * Used when OpenRouter fails
 */
export async function callClaudeFallback(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  anthropicApiKey: string
): Promise<FallbackResponse> {
  const startTime = Date.now();

  try {
    const client = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Extract system message
    const systemMessage =
      messages.find((m) => m.role === "system")?.content ||
      "You are a helpful cooking assistant.";

    // Filter out system messages for Claude API (system is a separate parameter)
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Call Claude Sonnet 4
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      temperature: 0.7,
      system: systemMessage,
      messages: conversationMessages,
    });

    // Extract response content
    const content =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    // Calculate cost
    const promptTokens = response.usage.input_tokens;
    const completionTokens = response.usage.output_tokens;
    const cost = calculateClaudeCost(promptTokens, completionTokens);

    // Calculate latency
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
  } catch (error) {
    // If Claude fallback also fails, throw with context
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Claude fallback failed: ${errorMessage}`);
  }
}

/**
 * Wrapper for router with automatic fallback
 * Tries OpenRouter first, falls back to Claude on failure
 */
export async function routeWithFallback(
  routerFn: () => Promise<any>,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  anthropicApiKey: string
): Promise<any> {
  try {
    // Try primary routing via OpenRouter
    const result = await routerFn();
    return result;
  } catch (error) {
    // Log fallback trigger
    console.warn("OpenRouter failed, falling back to Claude:", error);

    // Fall back to direct Claude
    const fallbackResponse = await callClaudeFallback(
      messages,
      anthropicApiKey
    );

    return {
      ...fallbackResponse,
      fallbackReason:
        error instanceof Error ? error.message : "Unknown OpenRouter error",
    };
  }
}

/**
 * Check if API keys are configured
 */
export function validateApiKeys(
  openrouterKey?: string,
  anthropicKey?: string
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!openrouterKey || openrouterKey.trim() === "") {
    errors.push("OPENROUTER_API_KEY is not configured");
  }

  if (!anthropicKey || anthropicKey.trim() === "") {
    errors.push("ANTHROPIC_API_KEY is not configured (required for fallback)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
