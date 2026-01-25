import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.32";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Intent types for routing
type CookingIntent =
  | "technique_question"
  | "substitution_request"
  | "troubleshooting"
  | "timing_question"
  | "temperature_question"
  | "ingredient_question"
  | "scaling_question"
  | "step_clarification"
  | "general_question"
  | "timer_command"
  | "preference_statement"
  | "modification_report";

interface IntentClassification {
  intent: CookingIntent;
  requiresRag: boolean;
  docTypes: string[];
  responseMode: "quick" | "focused" | "detailed";
}

// Classify intent based on message content
function classifyIntent(message: string): IntentClassification {
  const lowerMessage = message.toLowerCase();

  // Timer commands - no RAG needed
  if (
    lowerMessage.includes("start timer") ||
    lowerMessage.includes("set timer") ||
    lowerMessage.includes("timer for")
  ) {
    return {
      intent: "timer_command",
      requiresRag: false,
      docTypes: [],
      responseMode: "quick",
    };
  }

  // Substitution requests - search substitution docs
  if (
    lowerMessage.includes("substitute") ||
    lowerMessage.includes("instead of") ||
    lowerMessage.includes("don't have") ||
    lowerMessage.includes("replacement") ||
    lowerMessage.includes("alternative")
  ) {
    return {
      intent: "substitution_request",
      requiresRag: true,
      docTypes: ["substitution", "ingredient_info"],
      responseMode: "focused",
    };
  }

  // Technique questions
  if (
    lowerMessage.includes("how do i") ||
    lowerMessage.includes("how to") ||
    lowerMessage.includes("what does") ||
    lowerMessage.includes("what is") ||
    lowerMessage.includes("technique") ||
    lowerMessage.includes("method")
  ) {
    return {
      intent: "technique_question",
      requiresRag: true,
      docTypes: ["technique", "tip"],
      responseMode: "focused",
    };
  }

  // Temperature questions
  if (
    lowerMessage.includes("temperature") ||
    lowerMessage.includes("degrees") ||
    lowerMessage.includes("how hot") ||
    lowerMessage.includes("medium rare") ||
    lowerMessage.includes("well done") ||
    lowerMessage.includes("internal temp")
  ) {
    return {
      intent: "temperature_question",
      requiresRag: true,
      docTypes: ["technique", "tip"],
      responseMode: "quick",
    };
  }

  // Timing questions
  if (
    lowerMessage.includes("how long") ||
    lowerMessage.includes("minutes") ||
    lowerMessage.includes("when is it done") ||
    lowerMessage.includes("how do i know")
  ) {
    return {
      intent: "timing_question",
      requiresRag: true,
      docTypes: ["technique", "tip"],
      responseMode: "quick",
    };
  }

  // Troubleshooting
  if (
    lowerMessage.includes("too") ||
    lowerMessage.includes("not enough") ||
    lowerMessage.includes("problem") ||
    lowerMessage.includes("wrong") ||
    lowerMessage.includes("fix") ||
    lowerMessage.includes("help")
  ) {
    return {
      intent: "troubleshooting",
      requiresRag: true,
      docTypes: ["tip", "technique"],
      responseMode: "focused",
    };
  }

  // Step clarification
  if (
    lowerMessage.includes("step") ||
    lowerMessage.includes("explain") ||
    lowerMessage.includes("clarify") ||
    lowerMessage.includes("what do you mean")
  ) {
    return {
      intent: "step_clarification",
      requiresRag: false,
      docTypes: [],
      responseMode: "focused",
    };
  }

  // Scaling questions
  if (
    lowerMessage.includes("double") ||
    lowerMessage.includes("half") ||
    lowerMessage.includes("scale") ||
    lowerMessage.includes("more people") ||
    lowerMessage.includes("fewer")
  ) {
    return {
      intent: "scaling_question",
      requiresRag: false,
      docTypes: [],
      responseMode: "focused",
    };
  }

  // Ingredient questions
  if (
    lowerMessage.includes("ingredient") ||
    lowerMessage.includes("can i add") ||
    lowerMessage.includes("should i add")
  ) {
    return {
      intent: "ingredient_question",
      requiresRag: true,
      docTypes: ["ingredient_info", "tip"],
      responseMode: "focused",
    };
  }

  // Preference statements - user expressing likes/dislikes
  if (
    lowerMessage.includes("i like") ||
    lowerMessage.includes("i prefer") ||
    lowerMessage.includes("i don't like") ||
    lowerMessage.includes("i love") ||
    lowerMessage.includes("i hate") ||
    lowerMessage.includes("too spicy") ||
    lowerMessage.includes("too salty") ||
    lowerMessage.includes("not enough") ||
    lowerMessage.includes("more flavor")
  ) {
    return {
      intent: "preference_statement",
      requiresRag: false,
      docTypes: [],
      responseMode: "focused",
    };
  }

  // Modification reports - user reporting changes they made
  if (
    lowerMessage.includes("i added") ||
    lowerMessage.includes("i used") ||
    lowerMessage.includes("i changed") ||
    lowerMessage.includes("i modified") ||
    lowerMessage.includes("i swapped") ||
    lowerMessage.includes("instead i") ||
    lowerMessage.includes("i decided to")
  ) {
    return {
      intent: "modification_report",
      requiresRag: false,
      docTypes: [],
      responseMode: "quick",
    };
  }

  // Default to general question
  return {
    intent: "general_question",
    requiresRag: true,
    docTypes: ["tip", "technique"],
    responseMode: "focused",
  };
}

// Generate embedding using OpenAI
async function generateEmbedding(
  text: string,
  openaiApiKey: string
): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Build cooking mentor system prompt
function buildSystemPrompt(
  recipe: { title: string; mode: string },
  currentStep: number,
  totalSteps: number,
  skillLevel: string,
  ragContext: string
): string {
  return `You are Chef AI, an expert culinary mentor helping someone cook a recipe.

YOUR PERSONALITY:
- Warm, encouraging, patient
- Adapts to skill level naturally
- Uses sensory cues ("you'll hear a sizzle", "it should smell nutty")
- Never condescending, always supportive

SKILL LEVEL ADAPTATIONS:
${
  skillLevel === "beginner"
    ? `FOR BEGINNER:
- Explain every technique in simple terms
- Include safety warnings naturally
- Give visual/audio/smell cues for doneness
- Offer reassurance ("Don't worry if...")`
    : skillLevel === "chef"
      ? `FOR CHEF:
- Use professional terminology freely
- Focus on precision and refinement
- Share advanced techniques
- Discuss the "why" behind techniques`
      : `FOR HOME COOK:
- Use standard culinary terms
- Share tips for better results
- Mention common mistakes to avoid
- Assume basic technique knowledge`
}

CONTEXT:
- Recipe: ${recipe.title}
- Mode: ${recipe.mode}
- Current step: ${currentStep} of ${totalSteps}
- User skill: ${skillLevel}

RESPONSE GUIDELINES:
- Be concise - user has messy hands
- Always provide BOTH a full response AND a shorter voice_response for TTS (under 30 words)
- Reference the current step when relevant
- If asked about technique, explain with practical tips
${ragContext}

You MUST respond in this exact JSON format:
{
  "response": "Full text response here",
  "voice_response": "Shorter TTS version under 30 words"
}`;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get API keys
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!anthropicApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    // Get auth header for user identification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    // Verify user
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

    // Parse request body
    const { session_id, message, current_step } = await req.json();

    if (!session_id || !message) {
      return new Response(
        JSON.stringify({ error: "session_id and message are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch session with recipe details
    const { data: session, error: sessionError } = await supabase
      .from("cook_sessions")
      .select(
        `
        id,
        recipe_id,
        skill_level_used,
        current_step,
        recipes (
          id,
          title,
          mode,
          description,
          cuisine,
          recipe_steps (
            step_number,
            instruction,
            duration_minutes,
            timer_label,
            techniques,
            equipment
          ),
          recipe_ingredients (
            item,
            quantity,
            unit,
            preparation
          )
        )
      `
      )
      .eq("id", session_id)
      .eq("user_id", user.id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Session not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const recipe = session.recipes as {
      id: string;
      title: string;
      mode: string;
      description: string | null;
      cuisine: string | null;
      recipe_steps: Array<{
        step_number: number;
        instruction: string;
        duration_minutes: number | null;
        timer_label: string | null;
        techniques: string[] | null;
        equipment: string[] | null;
      }>;
      recipe_ingredients: Array<{
        item: string;
        quantity: number | null;
        unit: string | null;
        preparation: string | null;
      }>;
    };

    const skillLevel = session.skill_level_used || "home_cook";
    const totalSteps = recipe.recipe_steps?.length || 1;
    // Validate and clamp current_step to valid bounds (1 to totalSteps)
    const rawStep = current_step || session.current_step || 1;
    const stepNumber = Math.max(1, Math.min(rawStep, totalSteps));

    // Classify intent
    const intentResult = classifyIntent(message);

    // Build RAG context if needed
    let ragContext = "";
    const sources: Array<{ content: string; source: string }> = [];

    if (intentResult.requiresRag && openaiApiKey) {
      try {
        // Generate embedding for the query
        const embedding = await generateEmbedding(message, openaiApiKey);

        // Search global cooking knowledge
        const { data: knowledgeResults } = await supabase.rpc(
          "match_recipe_knowledge",
          {
            query_embedding: JSON.stringify(embedding),
            match_threshold: 0.7,
            match_count: 3,
            filter_mode: recipe.mode,
            filter_doc_types:
              intentResult.docTypes.length > 0
                ? intentResult.docTypes
                : undefined,
          }
        );

        // Search user's cooking memory
        const { data: memoryResults } = await supabase.rpc(
          "match_user_memory",
          {
            p_user_id: user.id,
            query_embedding: JSON.stringify(embedding),
            match_threshold: 0.7,
            match_count: 2,
          }
        );

        // Combine results
        const allDocs = [
          ...(memoryResults || []).map(
            (d: { content: string; memory_type: string }) => ({
              content: d.content,
              source: "Your Cooking History",
            })
          ),
          ...(knowledgeResults || []).map(
            (d: { content: string; doc_type: string }) => ({
              content: d.content,
              source: "Chef AI Knowledge Base",
            })
          ),
        ];

        if (allDocs.length > 0) {
          ragContext =
            "\n\nRELEVANT KNOWLEDGE:\n" +
            allDocs
              .map(
                (doc, i) => `[${i + 1}] ${doc.content}\n(Source: ${doc.source})`
              )
              .join("\n\n");
          sources.push(...allDocs);
        }
      } catch (ragError) {
        console.error("RAG search error:", ragError);
        // Continue without RAG context
      }
    }

    // Get recent conversation history (last 6 messages for context)
    const { data: recentMessages } = await supabase
      .from("cook_session_messages")
      .select("role, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: false })
      .limit(6);

    // Build conversation history for Claude
    const conversationHistory =
      recentMessages?.reverse().map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })) || [];

    // Build current step context
    const currentStepData = recipe.recipe_steps?.find(
      (s) => s.step_number === stepNumber
    );
    const stepContext = currentStepData
      ? `\nCURRENT STEP (${stepNumber}/${totalSteps}): ${currentStepData.instruction}`
      : "";

    // Build ingredients context
    const ingredientsContext =
      recipe.recipe_ingredients?.length > 0
        ? `\nINGREDIENTS: ${recipe.recipe_ingredients.map((i) => `${i.quantity || ""} ${i.unit || ""} ${i.item}${i.preparation ? ` (${i.preparation})` : ""}`).join(", ")}`
        : "";

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      recipe,
      stepNumber,
      totalSteps,
      skillLevel,
      ragContext + stepContext + ingredientsContext
    );

    // Call Claude
    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: [...conversationHistory, { role: "user", content: message }],
    });

    // Parse response
    let responseText = "";
    let voiceResponse = "";

    const contentBlock = claudeResponse.content[0];
    if (contentBlock.type === "text") {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(contentBlock.text);
        responseText = parsed.response || contentBlock.text;
        voiceResponse = parsed.voice_response || responseText.slice(0, 150);
      } catch {
        // If not valid JSON, use raw text
        responseText = contentBlock.text;
        voiceResponse = responseText.slice(0, 150);
      }
    }

    // Save user message to database
    await supabase.from("cook_session_messages").insert({
      session_id,
      role: "user",
      content: message,
      current_step: stepNumber,
    });

    // Save assistant response to database and get the ID for feedback
    const { data: savedMessage } = await supabase
      .from("cook_session_messages")
      .insert({
        session_id,
        role: "assistant",
        content: responseText,
        voice_response: voiceResponse,
        current_step: stepNumber,
        sources: sources.length > 0 ? sources : null,
      })
      .select("id")
      .single();

    // Update session current_step if changed (use clamped stepNumber to prevent invalid values)
    if (stepNumber !== session.current_step) {
      await supabase
        .from("cook_sessions")
        .update({ current_step: stepNumber })
        .eq("id", session_id);
    }

    return new Response(
      JSON.stringify({
        response: responseText,
        voice_response: voiceResponse,
        sources: sources.length > 0 ? sources : undefined,
        intent: intentResult.intent,
        message_id: savedMessage?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Cook chat error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to process message",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
