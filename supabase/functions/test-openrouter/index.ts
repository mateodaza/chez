// Test OpenRouter API directly
// Run: curl -X POST https://[project].supabase.co/functions/v1/test-openrouter

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ModelTest {
  name: string;
  id: string;
  testMessage: string;
}

const MODELS_TO_TEST: ModelTest[] = [
  {
    name: "Gemini Flash (Tier 1)",
    id: "google/gemini-flash-1.5",
    testMessage: "How long should I cook pasta?",
  },
  {
    name: "GPT-4o-mini (Tier 2)",
    id: "openai/gpt-4o-mini",
    testMessage: "Can I substitute butter for oil in baking?",
  },
  {
    name: "Claude Sonnet 4 (Tier 3)",
    id: "anthropic/claude-sonnet-4-20250514",
    testMessage: "My sauce separated and looks curdled, what went wrong?",
  },
];

async function testModel(apiKey: string, model: ModelTest) {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://chez.app",
          "X-Title": "Chez Cooking Assistant - Test",
        },
        body: JSON.stringify({
          model: model.id,
          messages: [
            { role: "system", content: "You are a helpful cooking assistant." },
            { role: "user", content: model.testMessage },
          ],
          max_tokens: 100,
          temperature: 0.7,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        model: model.name,
        success: false,
        error: errorData.error?.message || `HTTP ${response.status}`,
        statusCode: response.status,
        latency,
      };
    }

    const data = await response.json();

    return {
      model: model.name,
      success: true,
      content: data.choices?.[0]?.message?.content || "",
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    if (error instanceof Error && error.name === "AbortError") {
      return {
        model: model.name,
        success: false,
        error: "Request timeout (>15s)",
        latency,
      };
    }

    return {
      model: model.name,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      latency,
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "OPENROUTER_API_KEY not configured",
          hint: "Set it with: supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Testing OpenRouter API with 3 models...");

    // Test all models sequentially
    const results = [];
    for (const model of MODELS_TO_TEST) {
      console.log(`\nTesting ${model.name}...`);
      const result = await testModel(apiKey, model);
      results.push(result);
      console.log(
        `Result:`,
        result.success ? "✅ Success" : `❌ Failed: ${result.error}`
      );
    }

    // Summary
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify(
        {
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount,
            allPassed: failureCount === 0,
          },
          results,
          apiKeyPresent: true,
          apiKeyPrefix: apiKey.substring(0, 15) + "...",
        },
        null,
        2
      ),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Test failed:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
