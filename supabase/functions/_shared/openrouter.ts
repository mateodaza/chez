/**
 * OpenRouter Integration
 * Unified API client for multi-model AI routing
 * Supports Gemini Flash, Groq Llama, GPT-4o-mini, and Claude Sonnet 4
 */

export interface ModelConfig {
  id: string;
  promptCost: number; // USD per 1M tokens
  completionCost: number; // USD per 1M tokens
  maxTokens: number;
  timeoutMs: number;
}

export const MODELS: Record<string, ModelConfig> = {
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

export interface OpenRouterRequest {
  model: keyof typeof MODELS;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
}

export interface OpenRouterResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  latencyMs: number;
  model: string;
  provider: string;
}

export interface OpenRouterError {
  error: string;
  code?: string;
  statusCode?: number;
  retryable: boolean;
}

/**
 * Calculate cost based on token usage
 */
export function calculateCost(
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

/**
 * Check if error is retryable
 */
function isRetryableError(statusCode?: number): boolean {
  if (!statusCode) return false;
  // Retry on rate limits, timeouts, and server errors
  return statusCode === 429 || statusCode === 408 || statusCode >= 500;
}

/**
 * Parse OpenRouter error response
 */
function parseError(error: unknown, statusCode?: number): OpenRouterError {
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

/**
 * Call OpenRouter API with retry logic
 */
export async function callOpenRouter(
  request: OpenRouterRequest,
  apiKey: string,
  retries = 2
): Promise<OpenRouterResponse> {
  const config = MODELS[request.model];
  const startTime = Date.now();

  const requestBody = {
    model: config.id,
    messages: request.messages,
    max_tokens: request.maxTokens || config.maxTokens,
    temperature: request.temperature ?? 0.7,
  };

  let lastError: OpenRouterError | null = null;
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
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = parseError(errorData, response.status);

        // Retry if retryable and we have retries left
        if (lastError.retryable && attempt < retries) {
          attempt++;
          // Exponential backoff: 1s, 2s, 4s
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
          continue;
        }

        throw new Error(lastError.error);
      }

      const data = await response.json();

      // Extract response content
      const content = data.choices?.[0]?.message?.content || "";

      // Extract token usage
      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;

      // Calculate cost
      const cost = calculateCost(request.model, promptTokens, completionTokens);

      // Calculate latency
      const latencyMs = Date.now() - startTime;

      // Extract provider info (OpenRouter returns this)
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
      // Handle abort/timeout
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

      // Retry if retryable and we have retries left
      if (lastError.retryable && attempt < retries) {
        attempt++;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
        continue;
      }

      // Out of retries or non-retryable error
      throw new Error(
        `OpenRouter API failed after ${attempt + 1} attempts: ${lastError.error}`
      );
    }
  }

  // Should never reach here, but TypeScript needs this
  throw new Error("OpenRouter API failed: max retries exceeded");
}

/**
 * Build messages array for OpenRouter
 */
export function buildMessages(
  systemPrompt: string,
  userMessage: string,
  context?: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: systemPrompt }];

  // Add context if provided
  if (context) {
    messages.push({
      role: "system",
      content: `Context:\n${context}`,
    });
  }

  // Add history (up to last 6 messages for token budget)
  if (history && history.length > 0) {
    const recentHistory = history.slice(-6);
    messages.push(...recentHistory);
  }

  // Add current user message
  messages.push({
    role: "user",
    content: userMessage,
  });

  return messages;
}

/**
 * Estimate token count (rough approximation)
 * Used for token budgeting
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Truncate context to fit token budget
 */
export function truncateContext(context: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(context);

  if (estimatedTokens <= maxTokens) {
    return context;
  }

  // Truncate to approximate character limit
  const maxChars = maxTokens * 4;
  return context.slice(0, maxChars) + "...";
}
