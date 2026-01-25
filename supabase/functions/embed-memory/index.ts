import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai@4.73.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface EmbedRequest {
  memory_id: string;
  content: string;
}

/**
 * Embed Memory Edge Function
 *
 * Generates an embedding for a user memory and updates it in the database.
 * Called after a memory is created from positive feedback.
 *
 * Request body:
 *   { memory_id: string, content: string }
 *
 * Response:
 *   { success: true } or { error: string }
 */
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  }

  // Verify JWT and get user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");

  // Create a user-scoped client to verify the JWT
  const userClient = createClient(SUPABASE_URL, token);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body: EmbedRequest = await req.json();
    const { memory_id, content } = body;

    if (!memory_id || !content) {
      return new Response(
        JSON.stringify({ error: "Missing memory_id or content" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify user owns this memory before updating
    const { data: memory, error: fetchError } = await supabase
      .from("user_cooking_memory")
      .select("user_id")
      .eq("id", memory_id)
      .single();

    if (fetchError || !memory) {
      return new Response(JSON.stringify({ error: "Memory not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (memory.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Not authorized to update this memory" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[embed-memory] Generating embedding for memory ${memory_id} (user: ${user.id})`
    );

    // Generate embedding using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: content,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Update the memory with the embedding
    const { error: updateError } = await supabase
      .from("user_cooking_memory")
      .update({ embedding })
      .eq("id", memory_id)
      .eq("user_id", user.id); // Extra safety: also filter by user_id

    if (updateError) {
      console.error("[embed-memory] Update failed:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update memory with embedding" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[embed-memory] Successfully embedded memory ${memory_id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[embed-memory] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
