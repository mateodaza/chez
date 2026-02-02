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

    // IMPORTANT: Always fetch ORIGINAL version (v1), not current version
    // This implements "Replace mode" where My Version = Original + latest learnings
    const { data: originalVersion, error: originalVersionError } =
      await supabaseAdmin
        .from("master_recipe_versions")
        .select(
          "id, version_number, prep_time_minutes, cook_time_minutes, servings, servings_unit, difficulty_score, ingredients, steps, based_on_source_id"
        )
        .eq("master_recipe_id", master_recipe_id)
        .eq("version_number", 1) // Always v1 = Original
        .single();

    if (originalVersionError || !originalVersion) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Original version (v1) not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Start from ORIGINAL version's data (not current version)
    let baseIngredients: Ingredient[] =
      (originalVersion.ingredients as Ingredient[]) || [];
    let baseSteps: Step[] = (originalVersion.steps as Step[]) || [];
    let basedOnSourceId: string | null = originalVersion.based_on_source_id;

    // Optionally override with source link data if specified
    const effectiveSourceLinkId = source_link_id || session.source_link_id;

    if (effectiveSourceLinkId) {
      // Get data from the source link - MUST belong to the user's master_recipe
      const { data: sourceLink, error: sourceLinkError } = await supabaseAdmin
        .from("recipe_source_links")
        .select("id, master_recipe_id, extracted_ingredients, extracted_steps")
        .eq("id", effectiveSourceLinkId)
        .eq("master_recipe_id", master_recipe_id) // Verify ownership via master_recipe
        .single();

      if (!sourceLinkError && sourceLink) {
        const sourceIngredients =
          sourceLink.extracted_ingredients as Ingredient[];
        const sourceSteps = sourceLink.extracted_steps as Step[];

        // Only use source data if it has content
        if (sourceIngredients?.length > 0) {
          baseIngredients = sourceIngredients;
        }
        if (sourceSteps?.length > 0) {
          baseSteps = sourceSteps;
        }
        basedOnSourceId = sourceLink.id;
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

    // UPSERT v2 (My Version) - creates if doesn't exist, replaces if it does
    // This implements "Replace mode" where each save overwrites My Version
    const { data: myVersion, error: upsertError } = await supabaseAdmin
      .from("master_recipe_versions")
      .upsert(
        {
          master_recipe_id: master_recipe_id,
          version_number: 2, // Always v2 = My Version
          title: masterRecipe.title,
          description: masterRecipe.description,
          mode: masterRecipe.mode,
          cuisine: masterRecipe.cuisine,
          category: masterRecipe.category,
          prep_time_minutes: originalVersion.prep_time_minutes,
          cook_time_minutes: originalVersion.cook_time_minutes,
          servings: originalVersion.servings,
          servings_unit: originalVersion.servings_unit,
          difficulty_score: originalVersion.difficulty_score,
          ingredients: modifiedIngredients,
          steps: modifiedSteps,
          change_notes: `Updated from cooking session:\n${changeNotes.join("\n")}`,
          based_on_source_id: basedOnSourceId,
          parent_version_id: originalVersion.id, // Always parent is Original
          created_from_session_id: session_id,
          created_from_mode: "cook_session",
          created_from_title: createdFromTitle,
        },
        {
          onConflict: "master_recipe_id,version_number",
        }
      )
      .select("id")
      .single();

    if (upsertError) {
      console.error("Failed to upsert My Version:", upsertError);
      throw new Error(`Failed to save My Version: ${upsertError.message}`);
    }

    if (!myVersion?.id) {
      throw new Error("Failed to create My Version - no ID returned");
    }

    // Update master recipe to point to My Version (v2)
    await supabaseAdmin
      .from("master_recipes")
      .update({ current_version_id: myVersion.id })
      .eq("id", master_recipe_id);

    return new Response(
      JSON.stringify({
        success: true,
        version_id: myVersion.id,
        version_number: 2,
        changes_applied: changeNotes.length,
        message: `Saved My Version with ${changeNotes.length} modifications`,
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
