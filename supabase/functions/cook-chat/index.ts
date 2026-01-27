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

// Learning types that can be detected during cooking
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

// Intents that may contain learnings worth saving
const LEARNING_INTENTS: CookingIntent[] = [
  "substitution_request",
  "preference_statement",
  "modification_report",
];

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
    lowerMessage.includes("i'm using") ||
    lowerMessage.includes("i'll use") ||
    lowerMessage.includes("i will use") ||
    lowerMessage.includes("i changed") ||
    lowerMessage.includes("i modified") ||
    lowerMessage.includes("i swapped") ||
    lowerMessage.includes("instead i") ||
    lowerMessage.includes("i decided to") ||
    lowerMessage.includes("going to use") ||
    lowerMessage.includes("gonna use")
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
  ragContext: string,
  shouldExtractLearning: boolean,
  completedSteps: number[]
): string {
  // Always include learning detection instructions - the AI should ALWAYS look for learnings
  const learningInstruction = `
LEARNING DETECTION - VERY IMPORTANT:
You MUST detect and extract learnings whenever the user mentions ANY of the following:
- Substitutions: "I'm using X instead of Y", "I don't have X so I'll use Y", "I'll use X because..."
- Preferences: "I added more/less X", "I like it spicier/milder", "I prefer X"
- Modifications: "I changed X", "I'm doing X differently", "I added X"
- Timing adjustments: "I cooked it longer/shorter", "I let it rest more"
- Technique changes: "I did X instead of Y technique"

${shouldExtractLearning ? "The current message LIKELY contains a learning - look carefully!" : ""}

When you detect a learning, you MUST include a "learning" object in your JSON response with:
- type: "substitution" | "preference" | "timing" | "technique" | "addition"
- original: what the recipe called for (or null if adding something new)
- modification: what the user is doing/using instead
- summary: a SHORT human-readable summary (e.g., "Uses pancetta instead of guanciale", "Likes extra black pepper")

EXAMPLES of messages that MUST trigger learning extraction:
- "I'll use pancetta because I don't have guanciale" → learning: {type: "substitution", original: "guanciale", modification: "pancetta", summary: "Uses pancetta instead of guanciale"}
- "Added more pepper than the recipe said" → learning: {type: "preference", original: "recipe amount of pepper", modification: "extra black pepper", summary: "Prefers extra black pepper"}
- "I'm using rigatoni" (if recipe calls for different pasta) → learning: {type: "substitution", original: "spaghetti", modification: "rigatoni", summary: "Uses rigatoni instead of spaghetti"}

When acknowledging a learning, be warm: "Got it, I'll remember you prefer pancetta!" or "Nice choice with the extra pepper!"
`;

  const completedStepsStr =
    completedSteps.length > 0
      ? `Completed steps: ${completedSteps.join(", ")}`
      : "No steps completed yet";

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
- ${completedStepsStr}
- User skill: ${skillLevel}

STEP AWARENESS & FLOW:
You should actively guide the cooking flow:
- If the user seems to have finished the current step (e.g., "done", "finished", "it's ready", "looks good"), congratulate them and suggest moving to the next step
- If they're asking about something in a future step, acknowledge it but gently redirect to current step if needed
- If they mention completing a single task/step, include "suggest_complete_step": true in your response
- If they indicate they've completed ALL steps or the entire recipe (e.g., "all done", "all steps done", "finished everything", "completed the recipe"), set "complete_all_steps": true
- If they mention completing specific steps (e.g., "I did steps 3 through 5", "done with 2, 3, and 4"), list those step numbers in "complete_steps": [2, 3, 4]
- If they seem stuck or unsure, offer encouragement and specific guidance
- At the end of a step, you can ask "Ready for step X?" to keep the flow going

RESPONSE GUIDELINES:
- Be concise - user has messy hands
- Always provide BOTH a full response AND a shorter voice_response for TTS (under 30 words)
- Reference the current step when relevant
- If asked about technique, explain with practical tips
- Guide the user through the cooking process proactively
${ragContext}
${learningInstruction}

You MUST respond in this exact JSON format:
{
  "response": "Full text response here",
  "voice_response": "Shorter TTS version under 30 words",
  "suggest_complete_step": false,
  "complete_all_steps": false,
  "complete_steps": [],
  "suggested_next_step": null,
  "learning": null
}

IMPORTANT: The "learning" field should be null if no learning detected, OR an object like:
{ "type": "substitution", "original": "guanciale", "modification": "pancetta", "summary": "Uses pancetta instead of guanciale" }

Notes on JSON fields:
- suggest_complete_step: set to true if user seems to have completed current step
- complete_all_steps: set to true if user indicates they finished ALL steps/entire recipe
- complete_steps: array of step numbers if user mentions completing specific steps (e.g., [2, 3, 4])
- suggested_next_step: set to step number if suggesting user move to a specific step (or null)
- learning: ALWAYS include this field. Set to null if no learning detected, or an object with type/original/modification/summary if the user mentioned a substitution, preference, modification, timing change, or technique change. BE PROACTIVE about detecting learnings!`;
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

    // Fetch session with master recipe and version details
    const { data: session, error: sessionError } = await supabase
      .from("cook_sessions")
      .select(
        `
        id,
        master_recipe_id,
        version_id,
        skill_level_used,
        current_step,
        completed_steps,
        master_recipes (
          id,
          title,
          mode,
          description,
          cuisine,
          current_version:master_recipe_versions!fk_current_version (
            id,
            ingredients,
            steps
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

    // Extract master recipe (Supabase returns arrays for joins)
    const masterRecipeData = session.master_recipes as unknown;
    const masterRecipe = masterRecipeData as {
      id: string;
      title: string;
      mode: string;
      description: string | null;
      cuisine: string | null;
      current_version: Array<{
        id: string;
        ingredients: Array<{
          item: string;
          quantity: number | null;
          unit: string | null;
          preparation: string | null;
        }>;
        steps: Array<{
          step_number: number;
          instruction: string;
          duration_minutes: number | null;
          timer_label: string | null;
          techniques: string[] | null;
          equipment: string[] | null;
        }>;
      }> | null;
    };

    // Get current version (array from join)
    const currentVersion = masterRecipe?.current_version?.[0] || null;
    const recipeSteps = currentVersion?.steps || [];
    const recipeIngredients = currentVersion?.ingredients || [];

    // Build recipe object for compatibility with existing code
    const recipe = {
      id: masterRecipe?.id || "",
      title: masterRecipe?.title || "Recipe",
      mode: masterRecipe?.mode || "cooking",
      description: masterRecipe?.description || null,
      cuisine: masterRecipe?.cuisine || null,
      recipe_steps: recipeSteps,
      recipe_ingredients: recipeIngredients,
    };

    const skillLevel = session.skill_level_used || "home_cook";
    const totalSteps = recipeSteps.length || 1;
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

    // Check if this intent might contain a learning
    const shouldExtractLearning = LEARNING_INTENTS.includes(
      intentResult.intent
    );

    // Get completed steps from session
    const completedSteps = (session.completed_steps as number[]) || [];

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      recipe,
      stepNumber,
      totalSteps,
      skillLevel,
      ragContext + stepContext + ingredientsContext,
      shouldExtractLearning,
      completedSteps
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
    let detectedLearning: DetectedLearning | null = null;
    let suggestCompleteStep = false;
    let completeAllSteps = false;
    let completeSteps: number[] = [];
    let suggestedNextStep: number | null = null;

    const contentBlock = claudeResponse.content[0];
    if (contentBlock.type === "text") {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(contentBlock.text);
        responseText = parsed.response || contentBlock.text;
        voiceResponse = parsed.voice_response || responseText.slice(0, 150);
        suggestCompleteStep = parsed.suggest_complete_step === true;
        completeAllSteps = parsed.complete_all_steps === true;
        completeSteps = Array.isArray(parsed.complete_steps)
          ? parsed.complete_steps.filter((n: unknown) => typeof n === "number")
          : [];
        suggestedNextStep =
          typeof parsed.suggested_next_step === "number"
            ? parsed.suggested_next_step
            : null;

        // Extract learning if present
        if (
          parsed.learning &&
          parsed.learning.type &&
          parsed.learning.modification
        ) {
          detectedLearning = {
            type: parsed.learning.type,
            original: parsed.learning.original || null,
            modification: parsed.learning.modification,
            context: parsed.learning.summary || message,
            step_number: stepNumber,
            detected_at: new Date().toISOString(),
          };
        }
      } catch {
        // If not valid JSON, use raw text
        responseText = contentBlock.text;
        voiceResponse = responseText.slice(0, 150);
      }
    }

    // If a learning was detected, append it to the session's detected_learnings array
    // AND create a user_cooking_memory entry for RAG
    if (detectedLearning) {
      // Append to session learnings
      const { error: learningError } = await supabase.rpc(
        "append_detected_learning",
        {
          p_session_id: session_id,
          p_learning: detectedLearning,
        }
      );

      if (learningError) {
        console.error("Failed to save learning:", learningError);
      } else {
        console.log("Detected learning saved:", detectedLearning.context);

        // Also create a user_cooking_memory entry so RAG picks it up in future sessions
        const memoryContent = detectedLearning.context;
        const memoryType =
          detectedLearning.type === "substitution"
            ? "ingredient_substitution"
            : detectedLearning.type === "preference"
              ? "preference"
              : detectedLearning.type === "timing"
                ? "timing_adjustment"
                : "cooking_insight";

        const { data: memoryData, error: memoryError } = await supabase
          .from("user_cooking_memory")
          .insert({
            user_id: user.id,
            content: memoryContent,
            memory_type: memoryType,
            recipe_id: recipe.id,
            source_session_id: session_id,
            label: `${recipe.title}: ${detectedLearning.type}`,
          })
          .select("id")
          .single();

        if (memoryError) {
          console.error("Failed to create memory from learning:", memoryError);
        } else if (memoryData && openaiApiKey) {
          // Generate embedding for the memory asynchronously
          try {
            const embedding = await generateEmbedding(
              memoryContent,
              openaiApiKey
            );
            await supabase
              .from("user_cooking_memory")
              .update({ embedding: JSON.stringify(embedding) })
              .eq("id", memoryData.id);
            console.log(
              "Memory created with embedding from learning:",
              memoryContent
            );
          } catch (embedError) {
            console.error(
              "Failed to generate embedding for memory:",
              embedError
            );
          }
        }
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
        learning_saved: detectedLearning ? true : undefined,
        detected_learning: detectedLearning || undefined,
        suggest_complete_step: suggestCompleteStep || undefined,
        complete_all_steps: completeAllSteps || undefined,
        complete_steps: completeSteps.length > 0 ? completeSteps : undefined,
        suggested_next_step: suggestedNextStep || undefined,
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
