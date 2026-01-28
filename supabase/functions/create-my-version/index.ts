import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DetectedLearning {
  type: "substitution" | "preference" | "timing" | "technique" | "addition";
  original: string | null;
  modification: string;
  context: string;
  step_number: number;
  detected_at: string;
}

interface Ingredient {
  id: string;
  item: string;
  quantity: number | null;
  unit: string | null;
  preparation: string | null;
  is_optional: boolean | null;
  sort_order: number | null;
  original_text: string | null;
}

interface Step {
  id: string;
  step_number: number;
  instruction: string;
  duration_minutes: number | null;
  timer_label: string | null;
  temperature_value: number | null;
  temperature_unit: string | null;
  equipment: string[] | null;
  techniques: string[] | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing required env vars");
    return new Response(
      JSON.stringify({ success: false, error: "Server configuration error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { session_id, master_recipe_id, source_link_id } = await req.json();

    if (!session_id || !master_recipe_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "session_id and master_recipe_id are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authorization header required",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: authData, error: authError } =
      await supabaseClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired session" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const user = authData.user;

    // Verify the session belongs to this user and matches the master_recipe_id
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("cook_sessions")
      .select(
        "id, master_recipe_id, version_id, source_link_id, detected_learnings"
      )
      .eq("id", session_id)
      .eq("user_id", user.id)
      .eq("master_recipe_id", master_recipe_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Session not found or access denied",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const learnings = (session.detected_learnings as DetectedLearning[]) || [];
    if (learnings.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No learnings found in session",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the master recipe exists and belongs to the user
    const { data: masterRecipe, error: masterError } = await supabaseAdmin
      .from("master_recipes")
      .select(
        "id, title, description, mode, cuisine, category, current_version_id"
      )
      .eq("id", master_recipe_id)
      .eq("user_id", user.id)
      .single();

    if (masterError || !masterRecipe) {
      return new Response(
        JSON.stringify({ success: false, error: "Master recipe not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch current version separately to avoid FK join direction issues
    let currentVersionData: {
      id: string;
      version_number: number;
      prep_time_minutes: number | null;
      cook_time_minutes: number | null;
      servings: number | null;
      servings_unit: string | null;
      difficulty_score: number | null;
      ingredients: Ingredient[];
      steps: Step[];
    } | null = null;

    if (masterRecipe.current_version_id) {
      const { data: versionData } = await supabaseAdmin
        .from("master_recipe_versions")
        .select(
          "id, version_number, prep_time_minutes, cook_time_minutes, servings, servings_unit, difficulty_score, ingredients, steps"
        )
        .eq("id", masterRecipe.current_version_id)
        .single();

      if (versionData) {
        currentVersionData = {
          id: versionData.id,
          version_number: versionData.version_number,
          prep_time_minutes: versionData.prep_time_minutes,
          cook_time_minutes: versionData.cook_time_minutes,
          servings: versionData.servings,
          servings_unit: versionData.servings_unit,
          difficulty_score: versionData.difficulty_score,
          ingredients: (versionData.ingredients as Ingredient[]) || [],
          steps: (versionData.steps as Step[]) || [],
        };
      }
    }

    // Get base data - either from source link or current version
    let baseIngredients: Ingredient[] = [];
    let baseSteps: Step[] = [];
    let basedOnSourceId: string | null = null;

    const effectiveSourceLinkId = source_link_id || session.source_link_id;

    if (effectiveSourceLinkId) {
      // Get data from the source link - MUST belong to the user's master_recipe
      const { data: sourceLink, error: sourceLinkError } = await supabaseAdmin
        .from("recipe_source_links")
        .select(
          "id, master_recipe_id, extracted_ingredients, extracted_steps, video_sources(source_creator)"
        )
        .eq("id", effectiveSourceLinkId)
        .eq("master_recipe_id", master_recipe_id) // Verify ownership via master_recipe
        .single();

      if (sourceLinkError || !sourceLink) {
        // Source link doesn't exist or doesn't belong to this recipe - log but continue
        console.warn(
          `Source link ${effectiveSourceLinkId} not found or doesn't belong to recipe ${master_recipe_id}`
        );
      } else {
        baseIngredients =
          (sourceLink.extracted_ingredients as Ingredient[]) || [];
        baseSteps = (sourceLink.extracted_steps as Step[]) || [];
        basedOnSourceId = sourceLink.id;
      }
    }

    // Fallback to current version if no source data
    if (baseIngredients.length === 0 || baseSteps.length === 0) {
      if (currentVersionData) {
        if (baseIngredients.length === 0) {
          baseIngredients = currentVersionData.ingredients || [];
        }
        if (baseSteps.length === 0) {
          baseSteps = currentVersionData.steps || [];
        }
      }
    }

    // Apply learnings to create modified ingredients and steps
    const modifiedIngredients = [...baseIngredients];
    const modifiedSteps = [...baseSteps];
    const changeNotes: string[] = [];

    for (const learning of learnings) {
      changeNotes.push(learning.context);

      if (learning.type === "substitution" && learning.original) {
        // Find and update the ingredient
        const ingredientIndex = modifiedIngredients.findIndex((ing) =>
          ing.item.toLowerCase().includes(learning.original!.toLowerCase())
        );
        if (ingredientIndex >= 0) {
          modifiedIngredients[ingredientIndex] = {
            ...modifiedIngredients[ingredientIndex],
            item: learning.modification,
            original_text: `Originally: ${learning.original}`,
          };
        }
      } else if (learning.type === "timing" && learning.step_number) {
        // Update step timing
        const stepIndex = modifiedSteps.findIndex(
          (step) => step.step_number === learning.step_number
        );
        if (stepIndex >= 0) {
          // Try to extract minutes from the modification text
          const minutesMatch = learning.modification.match(/(\d+)\s*min/i);
          if (minutesMatch) {
            modifiedSteps[stepIndex] = {
              ...modifiedSteps[stepIndex],
              duration_minutes: parseInt(minutesMatch[1], 10),
            };
          }
        }
      } else if (learning.type === "addition") {
        // Add new ingredient
        modifiedIngredients.push({
          id: `learning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          item: learning.modification,
          quantity: null,
          unit: null,
          preparation: null,
          is_optional: false,
          sort_order: modifiedIngredients.length,
          original_text: "Added based on your cooking session",
        });
      }
      // Preferences and techniques are stored in change_notes rather than modifying structure
    }

    // Generate auto-title from learnings (e.g., "Used pancetta, added garlic")
    const generateVersionTitle = (learnings: DetectedLearning[]): string => {
      const summaries: string[] = [];
      for (const learning of learnings.slice(0, 3)) {
        if (learning.type === "substitution" && learning.original) {
          summaries.push(`Used ${learning.modification}`);
        } else if (learning.type === "addition") {
          summaries.push(`Added ${learning.modification}`);
        } else if (learning.type === "timing") {
          summaries.push(`Adjusted timing`);
        } else if (learning.type === "preference") {
          summaries.push(`Prefers ${learning.modification}`);
        } else if (learning.type === "technique") {
          summaries.push(`Changed technique`);
        }
      }
      return summaries.length > 0 ? summaries.join(", ") : "From Cook Session";
    };

    const createdFromTitle = generateVersionTitle(learnings);

    // Use a retry mechanism to handle version number conflicts
    // This handles race conditions when multiple requests try to create versions simultaneously
    let newVersion: { id: string } | null = null;
    let nextVersionNumber = 0;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Get the current max version number directly from the database
      const { data: maxVersionResult } = await supabaseAdmin
        .from("master_recipe_versions")
        .select("version_number")
        .eq("master_recipe_id", master_recipe_id)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

      nextVersionNumber = (maxVersionResult?.version_number || 0) + 1;

      // Try to create the new version with proper lineage tracking
      const { data: versionData, error: versionError } = await supabaseAdmin
        .from("master_recipe_versions")
        .insert({
          master_recipe_id: master_recipe_id,
          version_number: nextVersionNumber,
          title: masterRecipe.title,
          description: masterRecipe.description,
          mode: masterRecipe.mode,
          cuisine: masterRecipe.cuisine,
          category: masterRecipe.category,
          prep_time_minutes: currentVersionData?.prep_time_minutes,
          cook_time_minutes: currentVersionData?.cook_time_minutes,
          servings: currentVersionData?.servings,
          servings_unit: currentVersionData?.servings_unit,
          difficulty_score: currentVersionData?.difficulty_score,
          ingredients: modifiedIngredients,
          steps: modifiedSteps,
          change_notes: `Created from cooking session:\n${changeNotes.join("\n")}`,
          based_on_source_id: basedOnSourceId,
          // Version lineage tracking (fallback to current_version_id for legacy sessions)
          parent_version_id:
            session.version_id ?? masterRecipe.current_version_id,
          created_from_session_id: session_id, // Link back to cook session
          created_from_mode: "cook_session", // Creation context
          created_from_title: createdFromTitle, // Auto-generated label for dropdown
        })
        .select("id")
        .single();

      if (!versionError) {
        newVersion = versionData;
        break;
      }

      // Check if it's a unique constraint violation (version number conflict)
      if (versionError.code === "23505" && attempt < maxRetries - 1) {
        console.log(
          `Version number ${nextVersionNumber} conflict, retrying (attempt ${attempt + 1}/${maxRetries})`
        );
        continue;
      }

      // Other error or max retries reached
      console.error("Failed to create version:", versionError);
      throw new Error(`Failed to create version: ${versionError.message}`);
    }

    if (!newVersion) {
      throw new Error("Failed to create version after maximum retries");
    }

    // Update master recipe to point to new version
    await supabaseAdmin
      .from("master_recipes")
      .update({ current_version_id: newVersion.id })
      .eq("id", master_recipe_id);

    return new Response(
      JSON.stringify({
        success: true,
        version_id: newVersion.id,
        version_number: nextVersionNumber,
        changes_applied: changeNotes.length,
        message: `Created My Version (v${nextVersionNumber}) with ${changeNotes.length} modifications`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create my version error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
