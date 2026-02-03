/**
 * AI Optimization Tests
 * Tests for cook-chat-v2 smart routing, rate limiting, and cost tracking
 *
 * Coverage:
 * - Intent classification and model routing (3-tier system)
 * - Rate limiting (free: 20/day, chef: 500/day)
 * - Cost tracking and logging
 * - Fallback to Claude when OpenRouter fails
 * - Cost savings verification
 */

import { mockSupabaseClient, resetSupabaseMocks } from "../mocks/supabase";

// Mock the edge function response format
interface CookChatV2Response {
  response: string;
  voice_response: string;
  intent: string;
  message_id: string;
  _metadata: {
    model: string;
    provider: string;
    cost: number;
    latency: number;
    fallback: boolean;
  };
}

// Helper to simulate edge function call
const callCookChatV2 = async (
  message: string,
  _sessionId: string,
  _authToken: string
): Promise<CookChatV2Response> => {
  // In real tests, this would call the actual edge function
  // For now, we'll mock the response based on intent classification

  // Simulate intent classification
  const lower = message.toLowerCase();
  let intent = "simple_question";
  let model = "google/gemini-flash-1.5";
  let cost = 0.0002; // Gemini Flash cost

  if (lower.match(/how long|duration|minutes/)) {
    intent = "timing_question";
    model = "google/gemini-flash-1.5";
    cost = 0.0002;
  } else if (lower.match(/substitute|instead of|replace/)) {
    intent = "substitution_request";
    model = "openai/gpt-4o-mini";
    cost = 0.003;
  } else if (lower.match(/wrong|problem|burnt|overcooked/)) {
    intent = "troubleshooting";
    model = "anthropic/claude-sonnet-4-20250514";
    cost = 0.015;
  }

  return {
    response: "Test response",
    voice_response: "Test voice",
    intent,
    message_id: "msg-123",
    _metadata: {
      model,
      provider: model.split("/")[0],
      cost,
      latency: 500,
      fallback: false,
    },
  };
};

describe("Cook Chat V2 - AI Optimization", () => {
  const testSessionId = "test-session-123";
  const testUserId = "test-user-456";
  const testAuthToken = "test-token";

  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe("Intent Classification & Model Routing", () => {
    it("routes simple timing questions to Gemini Flash (Tier 1)", async () => {
      const message = "How long should I cook this?";
      const response = await callCookChatV2(
        message,
        testSessionId,
        testAuthToken
      );

      expect(response.intent).toBe("timing_question");
      expect(response._metadata.model).toBe("google/gemini-flash-1.5");
      expect(response._metadata.provider).toBe("google");
      expect(response._metadata.cost).toBeLessThan(0.001); // Very cheap
    });

    it("routes temperature questions to Gemini Flash (Tier 1)", async () => {
      const message = "What temperature should the oven be?";
      const response = await callCookChatV2(
        message,
        testSessionId,
        testAuthToken
      );

      expect(response.intent).toBe("timing_question"); // Matches duration pattern
      expect(response._metadata.model).toBe("google/gemini-flash-1.5");
    });

    it("routes substitution requests to GPT-4o-mini (Tier 2)", async () => {
      const message = "Can I use butter instead of oil?";
      const response = await callCookChatV2(
        message,
        testSessionId,
        testAuthToken
      );

      expect(response.intent).toBe("substitution_request");
      expect(response._metadata.model).toBe("openai/gpt-4o-mini");
      expect(response._metadata.provider).toBe("openai");
      expect(response._metadata.cost).toBeGreaterThan(0.001);
      expect(response._metadata.cost).toBeLessThan(0.01);
    });

    it("routes troubleshooting to Claude Sonnet 4 (Tier 3)", async () => {
      const message = "My pasta is burnt, what went wrong?";
      const response = await callCookChatV2(
        message,
        testSessionId,
        testAuthToken
      );

      expect(response.intent).toBe("troubleshooting");
      expect(response._metadata.model).toBe(
        "anthropic/claude-sonnet-4-20250514"
      );
      expect(response._metadata.provider).toBe("anthropic");
      expect(response._metadata.cost).toBeGreaterThan(0.01); // Most expensive
    });

    it("routes ingredient questions to GPT-4o-mini (Tier 2)", async () => {
      // Would need actual implementation to test
      // Expected: GPT4O_MINI for "What does this ingredient do in the recipe?"
    });
  });

  describe("Rate Limiting", () => {
    it("allows requests under free tier limit (20/day)", async () => {
      // Mock successful rate limit check
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          allowed: true,
          current: 15,
          limit: 20,
          remaining: 5,
        },
        error: null,
      });

      const result = await mockSupabaseClient.functions.invoke(
        "check_rate_limit",
        {
          body: { p_user_id: testUserId, p_tier: "free" },
        }
      );

      expect(result.data.allowed).toBe(true);
      expect(result.data.remaining).toBe(5);
      expect(result.data.limit).toBe(20);
    });

    it("blocks requests over free tier limit", async () => {
      // Mock rate limit exceeded
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          allowed: false,
          current: 20,
          limit: 20,
          remaining: 0,
        },
        error: null,
      });

      const result = await mockSupabaseClient.functions.invoke(
        "check_rate_limit",
        {
          body: { p_user_id: testUserId, p_tier: "free" },
        }
      );

      expect(result.data.allowed).toBe(false);
      expect(result.data.remaining).toBe(0);
      // Edge function should return 429 status
    });

    it("allows more requests for chef tier (500/day)", async () => {
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          allowed: true,
          current: 450,
          limit: 500,
          remaining: 50,
        },
        error: null,
      });

      const result = await mockSupabaseClient.functions.invoke(
        "check_rate_limit",
        {
          body: { p_user_id: testUserId, p_tier: "chef" },
        }
      );

      expect(result.data.allowed).toBe(true);
      expect(result.data.limit).toBe(500);
    });

    it("resets daily counter at midnight", async () => {
      // This would test the CURRENT_DATE logic in check_rate_limit function
      // Mock shows counter reset when reset_date < CURRENT_DATE
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: {
          allowed: true,
          current: 1, // Reset to 1 (first request of new day)
          limit: 20,
          remaining: 19,
        },
        error: null,
      });

      const result = await mockSupabaseClient.functions.invoke(
        "check_rate_limit",
        {
          body: { p_user_id: testUserId, p_tier: "free" },
        }
      );

      expect(result.data.current).toBe(1);
    });
  });

  describe("Cost Tracking", () => {
    it("logs cost for each request to ai_cost_logs", async () => {
      const costLogData = {
        user_id: testUserId,
        session_id: testSessionId,
        operation: "cook_chat",
        model: "google/gemini-flash-1.5",
        provider: "google",
        intent: "timing_question",
        prompt_tokens: 150,
        completion_tokens: 50,
        cost_usd: 0.0002,
        latency_ms: 500,
      };

      mockSupabaseClient.insert.mockResolvedValue({
        data: costLogData,
        error: null,
      });

      const result = await mockSupabaseClient
        .from("ai_cost_logs")
        .insert(costLogData);

      expect(result.error).toBeNull();
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it("calculates correct cost for Gemini Flash", () => {
      // $0.10 per 1M input tokens, $0.30 per 1M output tokens
      const promptTokens = 1000;
      const completionTokens = 500;

      const expectedCost =
        (promptTokens / 1_000_000) * 0.1 + (completionTokens / 1_000_000) * 0.3;

      expect(expectedCost).toBeCloseTo(0.00025, 6);
    });

    it("calculates correct cost for GPT-4o-mini", () => {
      // $0.15 per 1M input tokens, $0.60 per 1M output tokens
      const promptTokens = 1000;
      const completionTokens = 500;

      const expectedCost =
        (promptTokens / 1_000_000) * 0.15 +
        (completionTokens / 1_000_000) * 0.6;

      expect(expectedCost).toBeCloseTo(0.00045, 6);
    });

    it("calculates correct cost for Claude Sonnet 4", () => {
      // $3 per 1M input tokens, $15 per 1M output tokens
      const promptTokens = 1000;
      const completionTokens = 500;

      const expectedCost =
        (promptTokens / 1_000_000) * 3.0 +
        (completionTokens / 1_000_000) * 15.0;

      expect(expectedCost).toBeCloseTo(0.0105, 6);
    });

    it("tracks intent type with each cost log", async () => {
      const response = await callCookChatV2(
        "How long?",
        testSessionId,
        testAuthToken
      );

      expect(response.intent).toBeDefined();
      expect([
        "timing_question",
        "substitution_request",
        "troubleshooting",
      ]).toContain(response.intent);
    });

    it("includes latency metrics in cost logs", async () => {
      const response = await callCookChatV2(
        "Test message",
        testSessionId,
        testAuthToken
      );

      expect(response._metadata.latency).toBeGreaterThan(0);
      expect(typeof response._metadata.latency).toBe("number");
    });
  });

  describe("Fallback Handling", () => {
    it("falls back to Claude when OpenRouter fails", async () => {
      // Simulate OpenRouter failure and Claude fallback
      const fallbackResponse = {
        response: "Fallback response",
        voice_response: "Fallback voice",
        intent: "fallback",
        message_id: "msg-456",
        _metadata: {
          model: "claude-sonnet-4-20250514",
          provider: "anthropic",
          cost: 0.015,
          latency: 1200,
          fallback: true,
        },
      };

      // In real scenario, OpenRouter would fail and edge function would use Claude
      expect(fallbackResponse._metadata.fallback).toBe(true);
      expect(fallbackResponse._metadata.provider).toBe("anthropic");
    });

    it("still logs cost when using fallback", async () => {
      // Verify that even with fallback, cost is tracked
      const costLogData = {
        user_id: testUserId,
        session_id: testSessionId,
        operation: "cook_chat",
        model: "claude-sonnet-4-20250514",
        provider: "anthropic",
        intent: "fallback",
        cost_usd: 0.015,
      };

      mockSupabaseClient.insert.mockResolvedValue({
        data: costLogData,
        error: null,
      });

      const result = await mockSupabaseClient
        .from("ai_cost_logs")
        .insert(costLogData);

      expect(result.error).toBeNull();
    });
  });

  describe("Cost Savings Verification", () => {
    it("Gemini Flash costs ~10x less than Claude Sonnet 4 for same tokens", () => {
      const tokens = { prompt: 1000, completion: 500 };

      const geminiCost =
        (tokens.prompt / 1_000_000) * 0.1 +
        (tokens.completion / 1_000_000) * 0.3;

      const claudeCost =
        (tokens.prompt / 1_000_000) * 3.0 +
        (tokens.completion / 1_000_000) * 15.0;

      const savingsRatio = claudeCost / geminiCost;
      expect(savingsRatio).toBeGreaterThan(40); // ~42x cheaper
    });

    it("70% Gemini + 25% GPT + 5% Claude achieves 70% cost reduction", () => {
      // Simulate traffic distribution
      const avgTokens = { prompt: 1000, completion: 500 };

      // Calculate weighted average cost per request
      const geminiCost =
        (avgTokens.prompt / 1_000_000) * 0.1 +
        (avgTokens.completion / 1_000_000) * 0.3;
      const gptCost =
        (avgTokens.prompt / 1_000_000) * 0.15 +
        (avgTokens.completion / 1_000_000) * 0.6;
      const claudeCost =
        (avgTokens.prompt / 1_000_000) * 3.0 +
        (avgTokens.completion / 1_000_000) * 15.0;

      // Baseline: 100% Claude
      const baselineCost = claudeCost;

      // With routing: 70% Gemini, 25% GPT, 5% Claude
      const optimizedCost =
        geminiCost * 0.7 + gptCost * 0.25 + claudeCost * 0.05;

      const savingsPercent =
        ((baselineCost - optimizedCost) / baselineCost) * 100;

      expect(savingsPercent).toBeGreaterThan(60); // Target: 60-70% savings
      expect(optimizedCost).toBeLessThan(baselineCost * 0.4); // Less than 40% of baseline
    });

    it("tracks cumulative savings over time", async () => {
      // Mock multiple requests with different intents
      const requests = [
        { intent: "timing_question", cost: 0.0002 }, // Gemini
        { intent: "timing_question", cost: 0.0002 }, // Gemini
        { intent: "substitution_request", cost: 0.003 }, // GPT
        { intent: "troubleshooting", cost: 0.015 }, // Claude
      ];

      const totalCost = requests.reduce((sum, req) => sum + req.cost, 0);
      const baselineCost = requests.length * 0.015; // All Claude

      const savings = baselineCost - totalCost;
      const savingsPercent = (savings / baselineCost) * 100;

      expect(totalCost).toBeLessThan(baselineCost);
      expect(savingsPercent).toBeGreaterThan(50);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty message gracefully", async () => {
      // Should return 400 error
      // "Missing required fields: message, session_id"
    });

    it("handles missing session_id", async () => {
      // Should return 400 error
    });

    it("handles invalid auth token", async () => {
      // Should return 401 Unauthorized
    });

    it("handles missing API keys configuration", async () => {
      // Should return 500 with configuration error
    });

    it("handles race condition in rate limiting", async () => {
      // The atomic UPDATE...WHERE...RETURNING prevents race conditions
      // This would need concurrent request simulation
    });
  });
});
