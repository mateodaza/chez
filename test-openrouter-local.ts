#!/usr/bin/env -S deno run --allow-net --allow-env

// Local OpenRouter test script
// Usage: OPENROUTER_API_KEY=sk-or-v1-... deno run --allow-net --allow-env test-openrouter-local.ts

interface ModelTest {
  name: string;
  id: string;
  testMessage: string;
}

const MODELS: ModelTest[] = [
  {
    name: "Gemini Flash (Tier 1)",
    id: "google/gemini-flash-1.5",
    testMessage: "How long should I cook pasta?",
  },
  {
    name: "GPT-4o-mini (Tier 2)",
    id: "openai/gpt-4o-mini",
    testMessage: "Can I substitute butter for oil?",
  },
  {
    name: "Claude Sonnet 4 (Tier 3)",
    id: "anthropic/claude-sonnet-4-20250514",
    testMessage: "My sauce separated, what went wrong?",
  },
];

async function testModel(apiKey: string, model: ModelTest) {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    console.log(`\n🧪 Testing ${model.name}...`);
    console.log(`   Model ID: ${model.id}`);
    console.log(`   Question: "${model.testMessage}"`);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://chez.app",
          "X-Title": "Chez Test",
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
      console.log(
        `   ❌ FAILED (${response.status}): ${errorData.error?.message || "Unknown error"}`
      );
      console.log(`   Latency: ${latency}ms`);
      return { success: false, model: model.name, error: errorData, latency };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;

    console.log(`   ✅ SUCCESS`);
    console.log(
      `   Response: ${content.slice(0, 100)}${content.length > 100 ? "..." : ""}`
    );
    console.log(
      `   Tokens: ${promptTokens} prompt + ${completionTokens} completion`
    );
    console.log(`   Latency: ${latency}ms`);

    return {
      success: true,
      model: model.name,
      content,
      promptTokens,
      completionTokens,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;

    if (error instanceof Error && error.name === "AbortError") {
      console.log(`   ❌ TIMEOUT after ${latency}ms`);
      return { success: false, model: model.name, error: "Timeout", latency };
    }

    console.log(
      `   ❌ ERROR: ${error instanceof Error ? error.message : "Unknown"}`
    );
    return {
      success: false,
      model: model.name,
      error: error instanceof Error ? error.message : "Unknown",
      latency,
    };
  }
}

// Main
const apiKey = Deno.env.get("OPENROUTER_API_KEY");

if (!apiKey) {
  console.error("❌ OPENROUTER_API_KEY not set");
  console.error("   Set it with: export OPENROUTER_API_KEY=sk-or-v1-...");
  console.error("   Or get it from: npx supabase secrets list");
  Deno.exit(1);
}

console.log("🚀 Testing OpenRouter API");
console.log(`   API Key: ${apiKey.substring(0, 20)}...`);
console.log(`   Testing ${MODELS.length} models\n`);

const results = [];
for (const model of MODELS) {
  const result = await testModel(apiKey, model);
  results.push(result);
  await new Promise((resolve) => setTimeout(resolve, 500)); // Brief delay between tests
}

// Summary
console.log("\n" + "=".repeat(60));
console.log("📊 SUMMARY");
console.log("=".repeat(60));

const successful = results.filter((r) => r.success).length;
const failed = results.filter((r) => !r.success).length;

console.log(`Total: ${results.length}`);
console.log(`✅ Successful: ${successful}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log("\n❌ Failed models:");
  results
    .filter((r) => !r.success)
    .forEach((r) => {
      console.log(
        `   - ${r.model}: ${typeof r.error === "string" ? r.error : JSON.stringify(r.error)}`
      );
    });
  Deno.exit(1);
}

console.log("\n✅ All tests passed!");
