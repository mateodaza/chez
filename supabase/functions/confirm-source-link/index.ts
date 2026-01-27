import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ConfirmAction = "link_existing" | "create_new" | "reject";

interface ConfirmRequest {
  source_link_id: string;
  action: ConfirmAction;
  master_recipe_id?: string; // Required when action is "link_existing"
}

Deno.serve(async (req) => {
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
    const { source_link_id, action, master_recipe_id }: ConfirmRequest =
      await req.json();

    if (!source_link_id || !action) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "source_link_id and action are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "link_existing" && !master_recipe_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "master_recipe_id is required when linking to existing recipe",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user from JWT
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

    // Get the pending source link
    const { data: sourceLink, error: linkError } = await supabaseAdmin
      .from("recipe_source_links")
      .select(
        `
        *,
        video_sources (
          id,
          source_url,
          source_creator,
          source_thumbnail_url
        )
      `
      )
      .eq("id", source_link_id)
      .eq("user_id", user.id)
      .eq("link_status", "pending")
      .single();

    if (linkError || !sourceLink) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Source link not found or already processed",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle REJECT action
    if (action === "reject") {
      await supabaseAdmin
        .from("recipe_source_links")
        .update({ link_status: "rejected" })
        .eq("id", source_link_id);

      return new Response(
        JSON.stringify({
          success: true,
          action: "rejected",
          message: "Source link has been rejected",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle LINK_EXISTING action
    if (action === "link_existing") {
      // Check import limits before linking (each source counts as an import)
      const now = new Date();
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("subscription_tier, imports_this_month, imports_reset_at")
        .eq("id", user.id)
        .single();

      let currentImports = userData?.imports_this_month || 0;
      const resetAt = userData?.imports_reset_at
        ? new Date(userData.imports_reset_at)
        : null;

      // Reset monthly count if needed
      if (resetAt && now > resetAt) {
        currentImports = 0;
        const nextReset = new Date(
          now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(),
          now.getMonth() === 11 ? 0 : now.getMonth() + 1,
          1
        );
        await supabaseAdmin
          .from("users")
          .update({
            imports_this_month: 0,
            imports_reset_at: nextReset.toISOString(),
          })
          .eq("id", user.id);
      }

      // Enforce import limit for free users
      if (userData?.subscription_tier === "free" && currentImports >= 3) {
        return new Response(
          JSON.stringify({
            success: false,
            upgrade_required: true,
            message: "You've reached your monthly import limit (3 recipes).",
            resets_at: userData.imports_reset_at,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Verify the master recipe exists and belongs to the user
      const { data: existingMaster, error: masterError } = await supabaseAdmin
        .from("master_recipes")
        .select("id, title, current_version_id")
        .eq("id", master_recipe_id)
        .eq("user_id", user.id)
        .single();

      if (masterError || !existingMaster) {
        return new Response(
          JSON.stringify({ success: false, error: "Master recipe not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Link the source to the existing master recipe
      await supabaseAdmin
        .from("recipe_source_links")
        .update({
          master_recipe_id: master_recipe_id,
          link_status: "linked",
          linked_at: new Date().toISOString(),
        })
        .eq("id", source_link_id);

      // Increment import count (each source is an import)
      await supabaseAdmin
        .from("users")
        .update({ imports_this_month: currentImports + 1 })
        .eq("id", user.id);

      // Get count of sources for this master recipe
      const { count: sourceCount } = await supabaseAdmin
        .from("recipe_source_links")
        .select("*", { count: "exact", head: true })
        .eq("master_recipe_id", master_recipe_id)
        .eq("link_status", "linked");

      return new Response(
        JSON.stringify({
          success: true,
          action: "linked_existing",
          master_recipe_id: master_recipe_id,
          recipe: {
            id: existingMaster.id,
            title: existingMaster.title,
          },
          source_count: sourceCount || 1,
          message: `Added as a new source to "${existingMaster.title}"`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle CREATE_NEW action
    if (action === "create_new") {
      // Check import limits BEFORE creating anything
      const now = new Date();
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("subscription_tier, imports_this_month, imports_reset_at")
        .eq("id", user.id)
        .single();

      let currentImports = userData?.imports_this_month || 0;
      const resetAt = userData?.imports_reset_at
        ? new Date(userData.imports_reset_at)
        : null;

      // Reset monthly count if needed
      if (resetAt && now > resetAt) {
        currentImports = 0;
        const nextReset = new Date(
          now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(),
          now.getMonth() === 11 ? 0 : now.getMonth() + 1,
          1
        );
        await supabaseAdmin
          .from("users")
          .update({
            imports_this_month: 0,
            imports_reset_at: nextReset.toISOString(),
          })
          .eq("id", user.id);
      }

      // Enforce import limit for free users
      if (userData?.subscription_tier === "free" && currentImports >= 3) {
        return new Response(
          JSON.stringify({
            success: false,
            upgrade_required: true,
            message: "You've reached your monthly import limit (3 recipes).",
            resets_at: userData.imports_reset_at,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Create a new master recipe from the extracted data
      const { data: masterRecipe, error: createMasterError } =
        await supabaseAdmin
          .from("master_recipes")
          .insert({
            user_id: user.id,
            title: sourceLink.extracted_title,
            description: sourceLink.extracted_description,
            mode: sourceLink.extracted_mode,
            cuisine: sourceLink.extracted_cuisine,
            cover_video_source_id: null, // Will set after linking
          })
          .select("id")
          .single();

      if (createMasterError) {
        console.error("Failed to create master recipe:", createMasterError);
        throw new Error(
          `Failed to create master recipe: ${createMasterError.message}`
        );
      }

      // Create initial version (v1)
      const { data: version, error: versionError } = await supabaseAdmin
        .from("master_recipe_versions")
        .insert({
          master_recipe_id: masterRecipe.id,
          version_number: 1,
          title: sourceLink.extracted_title,
          description: sourceLink.extracted_description,
          mode: sourceLink.extracted_mode,
          cuisine: sourceLink.extracted_cuisine,
          ingredients: sourceLink.extracted_ingredients,
          steps: sourceLink.extracted_steps,
          based_on_source_id: source_link_id,
          change_notes: "Initial import from video",
        })
        .select("id")
        .single();

      if (versionError) {
        console.error("Failed to create version:", versionError);
        // Cleanup
        await supabaseAdmin
          .from("master_recipes")
          .delete()
          .eq("id", masterRecipe.id);
        throw new Error(`Failed to create version: ${versionError.message}`);
      }

      // Link the source to the new master recipe
      await supabaseAdmin
        .from("recipe_source_links")
        .update({
          master_recipe_id: masterRecipe.id,
          link_status: "linked",
          linked_at: new Date().toISOString(),
        })
        .eq("id", source_link_id);

      // Update master recipe with current_version_id and cover
      await supabaseAdmin
        .from("master_recipes")
        .update({
          current_version_id: version.id,
          cover_video_source_id: sourceLink.video_source_id,
        })
        .eq("id", masterRecipe.id);

      // Increment import count (currentImports already calculated and reset handled above)
      await supabaseAdmin
        .from("users")
        .update({ imports_this_month: currentImports + 1 })
        .eq("id", user.id);

      return new Response(
        JSON.stringify({
          success: true,
          action: "created_new",
          master_recipe_id: masterRecipe.id,
          version_id: version.id,
          recipe: {
            id: masterRecipe.id,
            title: sourceLink.extracted_title,
            description: sourceLink.extracted_description,
            mode: sourceLink.extracted_mode,
          },
          message: `Created new recipe "${sourceLink.extracted_title}"`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Confirm source link error:", error);
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
