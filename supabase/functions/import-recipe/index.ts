import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.32";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Platform = "youtube" | "tiktok" | "instagram" | "unknown";

function detectPlatform(url: string): {
  platform: Platform;
  videoId: string | null;
} {
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  const tiktokPatterns = [
    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /vm\.tiktok\.com\/([a-zA-Z0-9]+)/,
    /tiktok\.com\/t\/([a-zA-Z0-9]+)/,
  ];
  const instagramPatterns = [
    /instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/,
    /instagr\.am\/(?:reel|p)\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) return { platform: "youtube", videoId: match[1] };
  }
  for (const pattern of tiktokPatterns) {
    const match = url.match(pattern);
    if (match) return { platform: "tiktok", videoId: match[1] };
  }
  for (const pattern of instagramPatterns) {
    const match = url.match(pattern);
    if (match) return { platform: "instagram", videoId: match[1] };
  }

  return { platform: "unknown", videoId: null };
}

// URL Normalization - ensures same video always has same URL
function normalizeVideoUrl(
  url: string,
  platform: Platform,
  videoId: string
): string {
  switch (platform) {
    case "youtube":
      return `https://www.youtube.com/watch?v=${videoId}`;
    case "tiktok":
      // videoId may be a short code or numeric ID
      // For now, use the ID we have - resolution happens in resolveTikTokShortUrl
      return `https://www.tiktok.com/video/${videoId}`;
    case "instagram":
      return `https://www.instagram.com/reel/${videoId}`;
    default:
      return url;
  }
}

// Check if a TikTok video ID is a short code (not canonical numeric ID)
function isTikTokShortCode(videoId: string): boolean {
  // Canonical TikTok video IDs are 19-digit numbers
  // Short codes are alphanumeric and shorter
  return !/^\d{15,}$/.test(videoId);
}

// Resolve TikTok short URL to canonical URL by following redirects
async function resolveTikTokShortUrl(
  shortUrl: string
): Promise<{ normalizedUrl: string; videoId: string } | null> {
  try {
    // Use GET instead of HEAD - some TikTok endpoints block HEAD requests
    // response.url contains the final URL after redirects
    const response = await fetch(shortUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const finalUrl = response.url;
    console.log(`TikTok redirect: ${shortUrl} -> ${finalUrl}`);

    // Extract the canonical numeric video ID from the final URL
    const canonicalMatch = finalUrl.match(
      /tiktok\.com\/@[\w.-]+\/video\/(\d+)/
    );
    if (canonicalMatch) {
      const canonicalVideoId = canonicalMatch[1];
      return {
        normalizedUrl: `https://www.tiktok.com/video/${canonicalVideoId}`,
        videoId: canonicalVideoId,
      };
    }

    // If we can't extract a canonical ID, return null and use the original
    return null;
  } catch (error) {
    console.error("Failed to resolve TikTok short URL:", error);
    return null;
  }
}

const RECIPE_EXTRACTION_PROMPT = `You are an expert culinary AI that extracts recipes from video transcripts. You understand that speech-to-text often mishears culinary terms, especially foreign words.

## SPEECH-TO-TEXT CORRECTION
Transcripts often contain phonetic errors. You MUST recognize and correct these common mishearings:

ITALIAN:
- "puto/pruto/bruto" → "prosciutto" (cured ham)
- "pancheta/poncheta" → "pancetta" (Italian bacon)
- "parmyo/parmo/parmesian" → "parmigiano reggiano" or "parmesan"
- "rietoni/rigatone/rigotoni" → "rigatoni"
- "pen alavaka/penne vodka" → "penne alla vodka"
- "mozarella/motzerella" → "mozzarella"
- "ricota/ricotta" → "ricotta"
- "mascapone/marscapone" → "mascarpone"
- "gnocci/nyoki" → "gnocchi"
- "bruscheta/brushetta" → "bruschetta"
- "antipasta/anti pasto" → "antipasto"
- "calabrian/calabrese" → "Calabrian chili"
- "bomba/bamba" → "bomba" (spicy spread)
- "pata/passata" → "passata" (tomato puree)

FRENCH:
- "mwa pwa/mirepoix" → "mirepoix"
- "bresh/breesh" → "brioche"
- "croissant/kwason" → "croissant"
- "bouyon/bullion" → "bouillon"
- "consomay/consomme" → "consommé"
- "creme fresh/crem fresh" → "crème fraîche"
- "bechamel/beshmel" → "béchamel"
- "roo/rue" → "roux"
- "sautay/sotay" → "sauté"
- "flambe/flombay" → "flambé"
- "julienne/julianne" → "julienne"
- "mise en place/meez on plass" → "mise en place"

SPANISH/LATIN:
- "chimichuri/chimichurry" → "chimichurri"
- "halapeno/jalapeno" → "jalapeño"
- "choriso/choriso" → "chorizo"
- "sofrito/sofrita" → "sofrito"
- "mole/molay" → "mole"
- "queso/kayso" → "queso"
- "tortiya/tortia" → "tortilla"
- "cilantro/silantro" → "cilantro"

ASIAN:
- "miso/meeso" → "miso"
- "dashi/dahshi" → "dashi"
- "sake/sakay" → "sake"
- "mirin/meerin" → "mirin"
- "shoyu/shoyou" → "shoyu" (soy sauce)
- "gochujang/gochu jang" → "gochujang"
- "kimchi/kimchee" → "kimchi"
- "sriracha/siracha" → "sriracha"
- "fish sauce/nam pla" → "fish sauce"
- "sambal/samball" → "sambal"
- "tahini/tahina" → "tahini"

GENERAL COOKING:
- "saute/sotay/sautee" → "sauté"
- "deglaze/de glaze" → "deglaze"
- "reduce/reducing" → "reduce"
- "emulsify/emulcify" → "emulsify"
- "caramelize/caramalize" → "caramelize"

## CONFIDENCE STATUS FOR INGREDIENTS
For EACH ingredient, assign a confidence_status:
- "confirmed": Clearly stated name AND quantity (e.g., "two cups of flour")
- "needs_review": Name might be misheard OR quantity is vague (e.g., "some parmyo reo" → corrected to parmesan but flag for review)
- "inferred": Implied but not explicitly stated (e.g., "season it" implies salt)

When you correct a phonetic error, set:
- "item": the CORRECTED proper culinary term
- "original_text": the VERBATIM text from transcript (with the error)
- "confidence_status": "needs_review"
- "suggested_correction": null (only set if you're unsure between options)

## OUTPUT FORMAT
{
  "title": "The actual dish name only (e.g., 'Cacio e Pepe', 'Margarita', 'Croissant') - NOT the video title, channel name, or promotional text. Just the food/drink being made.",
  "description": "Brief description",
  "mode": "cooking" | "mixology" | "pastry",
  "category": "main_dish" | "appetizer" | "dessert" | "cocktail" | "bread" | "other",
  "cuisine": "italian" | "mexican" | "american" | "asian" | "french" | "indian" | "other" | null,
  "prep_time_minutes": number | null,
  "cook_time_minutes": number | null,
  "servings": number | null,
  "servings_unit": "servings" | "drinks" | "cookies" | "pieces" | null,
  "difficulty_score": 1-10,
  "ingredients": [
    {
      "item": "CORRECTED ingredient name (proper culinary term)",
      "quantity": number | null,
      "unit": "cups" | "oz" | "g" | "lb" | "tbsp" | "tsp" | "cloves" | "slices" | "to taste" | "whole" | null,
      "preparation": "diced" | "minced" | "sliced" | "melted" | "room temperature" | "grated" | "chopped" | null,
      "original_text": "verbatim quote from transcript (may contain errors)",
      "grocery_category": "produce" | "dairy" | "meat" | "seafood" | "pantry" | "spices" | "frozen" | "bakery" | "bar",
      "is_optional": boolean,
      "allergens": ["dairy", "gluten", "nuts", "eggs", "soy", "shellfish", "fish"],
      "confidence_status": "confirmed" | "needs_review" | "inferred",
      "suggested_correction": "alternative if unsure" | null
    }
  ],
  "steps": [
    {
      "step_number": 1,
      "instruction": "Clear instruction (use proper culinary terms)",
      "duration_minutes": number | null,
      "temperature_value": number | null,
      "temperature_unit": "F" | "C" | null,
      "equipment": ["pan", "whisk"],
      "techniques": ["sauté", "simmer"]
    }
  ],
  "confidence": 0.0-1.0,
  "confidence_notes": "List corrections made, uncertainties, and any ingredients needing user verification"
}

## MODE DETECTION
- MIXOLOGY: spirits, oz measurements, cocktail terms (shake, stir, muddle, bitters)
- PASTRY: flour/sugar/butter base, baking terms (fold, cream, proof, bake, rise)
- COOKING: savory dishes, proteins, vegetables (default)

## EXTRACTION RULES
1. Correct phonetic errors to proper culinary terms but keep original_text verbatim
2. If unsure between two corrections (e.g., "puto" could be prosciutto or pancetta), use context clues or set suggested_correction
3. Include ALL ingredients mentioned, even garnishes
4. For vague amounts ("some", "a bit"), use null quantity with confidence_status: "needs_review"
5. If an ingredient is implied but not stated (e.g., "oil in the pan" without specifying type), use confidence_status: "inferred"
6. Steps should use proper culinary terminology even if transcript used casual language

Return ONLY valid JSON, no markdown or explanatory text.`;

interface ExtractionResult {
  transcript: string | null;
  caption: string | null;
  title: string | null;
  creator: string | null;
  thumbnailUrl: string | null;
  method: string;
  layer: number;
}

async function logExtraction(
  supabaseAdmin: ReturnType<typeof createClient>,
  data: {
    platform: string;
    source_url: string;
    extraction_method: string;
    extraction_layer: number;
    success: boolean;
    error_message?: string;
    duration_ms?: number;
  }
) {
  try {
    await supabaseAdmin.from("extraction_logs").insert(data);
  } catch (e) {
    console.error("Failed to log extraction:", e);
  }
}

// Supadata API response types
interface SupadataVideoInfoResponse {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channel: string;
  channelId: string;
  duration: number;
}

interface SupadataTikTokResponse {
  title: string;
  description: string;
  thumbnail: string;
  author: string;
  authorId: string;
}

interface SupadataInstagramResponse {
  title: string;
  description: string;
  thumbnail: string;
  author: string;
  authorId: string;
}

async function fetchSupadataTranscript(
  videoId: string,
  platform: "youtube" | "tiktok" | "instagram"
): Promise<{
  transcript: string | null;
  metadata: Record<string, unknown> | null;
}> {
  const supadataApiKey = Deno.env.get("SUPADATA_API_KEY");

  if (!supadataApiKey) {
    console.log(
      "SUPADATA_API_KEY not configured, falling back to basic extraction"
    );
    return { transcript: null, metadata: null };
  }

  try {
    let transcriptUrl: string;
    let metadataUrl: string;

    switch (platform) {
      case "youtube":
        transcriptUrl = `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`;
        metadataUrl = `https://api.supadata.ai/v1/youtube/video?videoId=${videoId}`;
        break;
      case "tiktok":
        transcriptUrl = `https://api.supadata.ai/v1/tiktok/transcript?videoId=${videoId}&text=true`;
        metadataUrl = `https://api.supadata.ai/v1/tiktok/video?videoId=${videoId}`;
        break;
      case "instagram":
        transcriptUrl = `https://api.supadata.ai/v1/instagram/transcript?videoId=${videoId}&text=true`;
        metadataUrl = `https://api.supadata.ai/v1/instagram/video?videoId=${videoId}`;
        break;
    }

    const headers = {
      "x-api-key": supadataApiKey,
      "Content-Type": "application/json",
    };

    const [transcriptRes, metadataRes] = await Promise.all([
      fetch(transcriptUrl, { headers }),
      fetch(metadataUrl, { headers }),
    ]);

    let transcript: string | null = null;
    let metadata: Record<string, unknown> | null = null;

    if (transcriptRes.ok) {
      const transcriptData = await transcriptRes.json();
      if (Array.isArray(transcriptData.content)) {
        transcript = transcriptData.content
          .map((seg: { text: string }) => seg.text)
          .join(" ");
      } else if (typeof transcriptData.content === "string") {
        transcript = transcriptData.content;
      }
      console.log(
        `Supadata transcript fetched: ${transcript?.length || 0} chars`
      );
    } else {
      console.log(
        `Supadata transcript failed: ${transcriptRes.status}`,
        await transcriptRes.text()
      );
    }

    if (metadataRes.ok) {
      metadata = await metadataRes.json();
      console.log(`Supadata metadata fetched for ${platform}`);
    } else {
      console.log(`Supadata metadata failed: ${metadataRes.status}`);
    }

    return { transcript, metadata };
  } catch (error) {
    console.error("Supadata API error:", error);
    return { transcript: null, metadata: null };
  }
}

async function fetchYouTubeTranscriptFree(
  videoId: string
): Promise<string | null> {
  try {
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(videoPageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!pageResponse.ok) {
      console.log("Failed to fetch YouTube page:", pageResponse.status);
      return null;
    }

    const pageHtml = await pageResponse.text();

    const playerResponseMatch =
      pageHtml.match(/var ytInitialPlayerResponse\s*=\s*({.+?});/s) ||
      pageHtml.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);

    if (!playerResponseMatch) {
      console.log("Could not find player response in page");
      return null;
    }

    let playerResponse;
    try {
      playerResponse = JSON.parse(playerResponseMatch[1]);
    } catch {
      console.log("Failed to parse player response JSON");
      return null;
    }

    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      console.log("No caption tracks available");
      return null;
    }

    const englishTrack = captionTracks.find(
      (track: { languageCode: string }) =>
        track.languageCode === "en" || track.languageCode?.startsWith("en")
    );
    const selectedTrack = englishTrack || captionTracks[0];

    if (!selectedTrack?.baseUrl) {
      console.log("No caption URL found");
      return null;
    }

    const transcriptResponse = await fetch(selectedTrack.baseUrl);
    if (!transcriptResponse.ok) return null;

    const transcriptXml = await transcriptResponse.text();
    const segments: string[] = [];
    const textMatches = transcriptXml.matchAll(/<text[^>]*>([^<]*)<\/text>/g);

    for (const match of textMatches) {
      const text = match[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, " ")
        .trim();
      if (text) segments.push(text);
    }

    if (segments.length === 0) return null;

    const transcript = segments.join(" ");
    console.log(
      `Free transcript extracted: ${segments.length} segments, ${transcript.length} chars`
    );
    return transcript;
  } catch (error) {
    console.error("Free transcript fetch error:", error);
    return null;
  }
}

async function extractYouTube(videoId: string): Promise<ExtractionResult> {
  try {
    const supadataApiKey = Deno.env.get("SUPADATA_API_KEY");
    let transcript: string | null = null;
    let title: string | null = null;
    let creator: string | null = null;
    let thumbnailUrl: string | null = null;
    let method = "youtube_oembed";

    if (supadataApiKey) {
      const supadataResult = await fetchSupadataTranscript(videoId, "youtube");
      transcript = supadataResult.transcript;

      if (supadataResult.metadata) {
        const ytMeta = supadataResult.metadata as SupadataVideoInfoResponse;
        title = ytMeta.title || null;
        creator = ytMeta.channel || null;
        thumbnailUrl = ytMeta.thumbnail || null;
      }

      if (transcript) {
        method = "supadata_transcript";
      }
    }

    if (!transcript) {
      console.log("Trying free YouTube transcript extraction...");
      transcript = await fetchYouTubeTranscriptFree(videoId);
      if (transcript) {
        method = "innertube_transcript";
      }
    }

    if (!title || !creator) {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const oembedResponse = await fetch(oembedUrl);

      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json();
        title = title || oembedData.title || null;
        creator = creator || oembedData.author_name || null;
        thumbnailUrl = thumbnailUrl || oembedData.thumbnail_url || null;
      }
    }

    const layer = transcript ? 1 : 2;
    console.log(
      `YouTube extraction: method=${method}, hasTranscript=${!!transcript}`
    );

    return {
      transcript,
      caption: title,
      title,
      creator,
      thumbnailUrl,
      method,
      layer,
    };
  } catch (error) {
    console.error("YouTube extraction error:", error);
    throw new Error(
      `YouTube extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function extractTikTok(videoId: string): Promise<ExtractionResult> {
  try {
    const { transcript, metadata } = await fetchSupadataTranscript(
      videoId,
      "tiktok"
    );

    let title: string | null = null;
    let creator: string | null = null;
    let thumbnailUrl: string | null = null;
    let description: string | null = null;

    if (metadata) {
      const tiktokMeta = metadata as SupadataTikTokResponse;
      title = tiktokMeta.title || null;
      description = tiktokMeta.description || null;
      creator = tiktokMeta.author || null;
      thumbnailUrl = tiktokMeta.thumbnail || null;
    }

    const hasContent = transcript || description || title;
    const method = transcript
      ? "supadata_transcript"
      : hasContent
        ? "supadata_metadata"
        : "tiktok_placeholder";
    const layer = transcript ? 1 : hasContent ? 2 : 5;

    console.log(
      `TikTok extraction: method=${method}, hasTranscript=${!!transcript}`
    );

    return {
      transcript,
      caption: description || title,
      title,
      creator,
      thumbnailUrl,
      method,
      layer,
    };
  } catch (error) {
    console.error("TikTok extraction error:", error);
    return {
      transcript: null,
      caption: null,
      title: null,
      creator: null,
      thumbnailUrl: null,
      method: "tiktok_error",
      layer: 5,
    };
  }
}

async function extractInstagram(videoId: string): Promise<ExtractionResult> {
  try {
    const { transcript, metadata } = await fetchSupadataTranscript(
      videoId,
      "instagram"
    );

    let title: string | null = null;
    let creator: string | null = null;
    let thumbnailUrl: string | null = null;
    let description: string | null = null;

    if (metadata) {
      const igMeta = metadata as SupadataInstagramResponse;
      title = igMeta.title || null;
      description = igMeta.description || null;
      creator = igMeta.author || null;
      thumbnailUrl = igMeta.thumbnail || null;
    }

    const hasContent = transcript || description || title;
    const method = transcript
      ? "supadata_transcript"
      : hasContent
        ? "supadata_metadata"
        : "instagram_placeholder";
    const layer = transcript ? 1 : hasContent ? 2 : 5;

    console.log(
      `Instagram extraction: method=${method}, hasTranscript=${!!transcript}`
    );

    return {
      transcript,
      caption: description || title,
      title,
      creator,
      thumbnailUrl,
      method,
      layer,
    };
  } catch (error) {
    console.error("Instagram extraction error:", error);
    return {
      transcript: null,
      caption: null,
      title: null,
      creator: null,
      thumbnailUrl: null,
      method: "instagram_error",
      layer: 5,
    };
  }
}

function getNextMonthReset(now: Date): Date {
  const year =
    now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const month = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
  return new Date(year, month, 1);
}

// Check for similar existing master recipes (fuzzy title match + same mode)
async function findSimilarMasterRecipes(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  title: string,
  mode: string
): Promise<
  Array<{
    id: string;
    title: string;
    source_count: number;
    times_cooked: number;
  }>
> {
  // Normalize title for comparison
  const normalizedTitle = title.toLowerCase().trim();

  // Get user's master recipes with same mode
  const { data: masterRecipes } = await supabaseAdmin
    .from("master_recipes")
    .select(
      `
      id,
      title,
      mode,
      times_cooked,
      recipe_source_links(count)
    `
    )
    .eq("user_id", userId)
    .eq("mode", mode);

  if (!masterRecipes || masterRecipes.length === 0) {
    return [];
  }

  // Simple fuzzy matching: check for similar words
  const titleWords = normalizedTitle.split(/\s+/).filter((w) => w.length > 2);

  const similar = masterRecipes
    .map((recipe) => {
      const recipeTitle = recipe.title.toLowerCase();
      const matchingWords = titleWords.filter((word) =>
        recipeTitle.includes(word)
      );
      const similarity = matchingWords.length / Math.max(titleWords.length, 1);
      return {
        ...recipe,
        similarity,
        source_count: Array.isArray(recipe.recipe_source_links)
          ? recipe.recipe_source_links.length
          : (recipe.recipe_source_links as { count: number })?.count || 0,
      };
    })
    .filter((r) => r.similarity >= 0.5) // At least 50% word match
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3) // Top 3 matches
    .map(({ id, title, source_count, times_cooked }) => ({
      id,
      title,
      source_count,
      times_cooked,
    }));

  return similar;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  let platform: Platform = "unknown";
  let extractionMethod = "unknown";
  let extractionLayer = 0;
  let sourceUrl = "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing required env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
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
    const { url, force_mode, manual_content } = await req.json();
    sourceUrl = url || "manual_entry";

    if (!url && !manual_content) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "URL or manual content is required",
        }),
        {
          status: 200,
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
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired session" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const user = authData.user;
    console.log("Authenticated user:", user.id);

    // Ensure user exists in our users table
    const now = new Date();
    const { data: userData, error: upsertError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email || "",
          subscription_tier: "free",
          imports_this_month: 0,
          imports_reset_at: getNextMonthReset(now).toISOString(),
        },
        { onConflict: "id", ignoreDuplicates: true }
      )
      .select("subscription_tier, imports_this_month, imports_reset_at")
      .single();

    if (upsertError) {
      const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from("users")
        .select("subscription_tier, imports_this_month, imports_reset_at")
        .eq("id", user.id)
        .single();

      if (fetchError || !existingUser) {
        console.error("Failed to get/create user:", upsertError, fetchError);
        throw new Error("Failed to initialize user account");
      }
      Object.assign(userData || {}, existingUser);
    }

    let currentImports = userData?.imports_this_month || 0;
    const resetAt = userData?.imports_reset_at
      ? new Date(userData.imports_reset_at)
      : null;

    if (resetAt && now > resetAt) {
      currentImports = 0;
      const nextReset = getNextMonthReset(now);
      await supabaseAdmin
        .from("users")
        .update({
          imports_this_month: 0,
          imports_reset_at: nextReset.toISOString(),
        })
        .eq("id", user.id);
    }

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

    let extraction: ExtractionResult;
    let isManualEntry = false;
    let normalizedUrl: string | null = null;
    let videoId: string | null = null;

    if (manual_content) {
      platform = "unknown";
      isManualEntry = true;
      extraction = {
        transcript:
          manual_content.transcript || manual_content.recipe_text || null,
        caption: manual_content.caption || manual_content.recipe_text || null,
        title: manual_content.title || null,
        creator: manual_content.creator || null,
        thumbnailUrl: null,
        method: "manual",
        layer: 5,
      };
    } else {
      const detection = detectPlatform(url);
      platform = detection.platform;
      videoId = detection.videoId;

      if (platform === "unknown" || !videoId) {
        await logExtraction(supabaseAdmin, {
          platform: "unknown",
          source_url: url,
          extraction_method: "url_detection",
          extraction_layer: 0,
          success: false,
          error_message: "Unsupported URL or could not extract video ID",
          duration_ms: Date.now() - startTime,
        });

        return new Response(
          JSON.stringify({
            success: false,
            error: "Unsupported URL or could not extract video ID",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Normalize URL for consistent storage
      // For TikTok short codes, resolve to canonical numeric ID first
      if (platform === "tiktok" && isTikTokShortCode(videoId)) {
        console.log(`TikTok short code detected: ${videoId}, resolving...`);
        const resolved = await resolveTikTokShortUrl(url);
        if (resolved) {
          normalizedUrl = resolved.normalizedUrl;
          videoId = resolved.videoId;
          console.log(`Resolved to canonical ID: ${videoId}`);
        } else {
          // Fallback to using the short code if resolution fails
          normalizedUrl = normalizeVideoUrl(url, platform, videoId);
          console.log(`Resolution failed, using short code: ${videoId}`);
        }
      } else {
        normalizedUrl = normalizeVideoUrl(url, platform, videoId);
      }
      console.log(`Normalized URL: ${normalizedUrl}`);

      // ===== NEW MULTI-SOURCE FLOW =====

      // Step 1: Check if video_source already exists (global cache)
      const { data: existingVideoSource } = await supabaseAdmin
        .from("video_sources")
        .select("*")
        .eq("source_url", normalizedUrl)
        .single();

      if (existingVideoSource?.raw_transcript) {
        // Reuse cached transcript
        console.log("Reusing cached video source transcript");
        extraction = {
          transcript: existingVideoSource.raw_transcript,
          caption: existingVideoSource.raw_caption,
          title: existingVideoSource.extracted_title,
          creator: existingVideoSource.source_creator,
          thumbnailUrl: existingVideoSource.source_thumbnail_url,
          method: `reused_${existingVideoSource.extraction_method || "transcript"}`,
          layer: existingVideoSource.extraction_layer || 1,
        };

        // Update last_accessed_at
        await supabaseAdmin
          .from("video_sources")
          .update({ last_accessed_at: new Date().toISOString() })
          .eq("id", existingVideoSource.id);
      } else {
        // Fetch fresh transcript
        switch (platform) {
          case "youtube":
            extraction = await extractYouTube(videoId);
            break;
          case "tiktok":
            extraction = await extractTikTok(videoId);
            break;
          case "instagram":
            extraction = await extractInstagram(videoId);
            break;
          default:
            throw new Error("Unsupported platform");
        }
      }
    }

    extractionMethod = extraction.method;
    extractionLayer = extraction.layer;

    const hasContent =
      extraction.transcript || extraction.caption || extraction.title;

    if (!hasContent) {
      await logExtraction(supabaseAdmin, {
        platform: platform !== "unknown" ? platform : "manual",
        source_url: sourceUrl,
        extraction_method: extractionMethod,
        extraction_layer: extractionLayer,
        success: false,
        error_message: "No content extracted - fallback to manual entry",
        duration_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({
          success: false,
          fallback_mode: true,
          message:
            "Could not extract content automatically. Please enter recipe details manually.",
          manual_fields: ["title", "recipe_text", "creator"],
          platform: platform,
          extraction: { method: extraction.method, layer: extraction.layer },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Run Claude extraction
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const extractionInput = `
VIDEO TITLE: ${extraction.title || "Unknown"}
CREATOR: ${extraction.creator || "Unknown"}
TRANSCRIPT: ${extraction.transcript || "Not available"}
CAPTION/DESCRIPTION: ${extraction.caption || "Not available"}
${force_mode ? `FORCE MODE: ${force_mode}` : ""}
`.trim();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `${RECIPE_EXTRACTION_PROMPT}\n\n---\n\n${extractionInput}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let recipe;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      recipe = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse Claude response:", responseText);
      await logExtraction(supabaseAdmin, {
        platform: platform !== "unknown" ? platform : "manual",
        source_url: sourceUrl,
        extraction_method: extractionMethod,
        extraction_layer: extractionLayer,
        success: false,
        error_message: "Failed to parse recipe from AI response",
        duration_ms: Date.now() - startTime,
      });
      throw new Error("Failed to parse recipe from AI response");
    }

    if (!recipe.title || !recipe.mode || !recipe.ingredients || !recipe.steps) {
      await logExtraction(supabaseAdmin, {
        platform: platform !== "unknown" ? platform : "manual",
        source_url: sourceUrl,
        extraction_method: extractionMethod,
        extraction_layer: extractionLayer,
        success: false,
        error_message: "Recipe extraction incomplete - missing required fields",
        duration_ms: Date.now() - startTime,
      });
      throw new Error("Recipe extraction incomplete - missing required fields");
    }

    const {
      ingredients,
      steps,
      confidence,
      confidence_notes,
      ...recipeFields
    } = recipe;

    // ===== MULTI-SOURCE STORAGE =====

    // Step 2: Create or update video_sources (global cache)
    let videoSourceId: string | null = null;

    if (normalizedUrl && !isManualEntry) {
      const { data: existingSource } = await supabaseAdmin
        .from("video_sources")
        .select("id")
        .eq("source_url", normalizedUrl)
        .single();

      if (existingSource) {
        videoSourceId = existingSource.id;
        // Update with latest extraction if we have new data
        if (!extraction.method.startsWith("reused_")) {
          await supabaseAdmin
            .from("video_sources")
            .update({
              raw_transcript: extraction.transcript,
              raw_caption: extraction.caption,
              source_creator: extraction.creator,
              source_thumbnail_url: extraction.thumbnailUrl,
              extracted_title: recipe.title,
              extracted_description: recipe.description,
              extraction_method: extraction.method,
              extraction_layer: extraction.layer,
              extraction_confidence: confidence,
              last_accessed_at: new Date().toISOString(),
            })
            .eq("id", existingSource.id);
        }
      } else {
        // Create new video source
        const { data: newSource, error: sourceError } = await supabaseAdmin
          .from("video_sources")
          .insert({
            source_url: normalizedUrl,
            source_platform: platform,
            video_id: videoId,
            source_creator: extraction.creator,
            source_thumbnail_url: extraction.thumbnailUrl,
            raw_transcript: extraction.transcript,
            raw_caption: extraction.caption,
            extracted_title: recipe.title,
            extracted_description: recipe.description,
            extraction_method: extraction.method,
            extraction_layer: extraction.layer,
            extraction_confidence: confidence,
          })
          .select("id")
          .single();

        if (sourceError) {
          console.error("Failed to create video source:", sourceError);
          throw new Error(
            `Failed to create video source: ${sourceError.message}`
          );
        }
        videoSourceId = newSource.id;
      }
    }

    // Prepare JSONB data for ingredients and steps (needed for all paths)
    const ingredientsJson = ingredients.map(
      (ing: Record<string, unknown>, i: number) => ({
        id: crypto.randomUUID(),
        item: ing.item,
        quantity: ing.quantity,
        unit: ing.unit,
        preparation: ing.preparation,
        original_text: ing.original_text,
        grocery_category: ing.grocery_category,
        is_optional: ing.is_optional || false,
        allergens: ing.allergens || [],
        confidence_status: ing.confidence_status || "confirmed",
        suggested_correction: ing.suggested_correction || null,
        user_verified: false,
        sort_order: i,
      })
    );

    const stepsJson = steps.map((step: Record<string, unknown>) => ({
      id: crypto.randomUUID(),
      step_number: step.step_number,
      instruction: step.instruction,
      duration_minutes: step.duration_minutes,
      temperature_value: step.temperature_value,
      temperature_unit: step.temperature_unit,
      equipment: step.equipment || [],
      techniques: step.techniques || [],
    }));

    // Step 3: Check if user already has this source linked
    if (videoSourceId) {
      const { data: existingLink } = await supabaseAdmin
        .from("recipe_source_links")
        .select("id, master_recipe_id, link_status")
        .eq("user_id", user.id)
        .eq("video_source_id", videoSourceId)
        .neq("link_status", "rejected")
        .single();

      if (existingLink) {
        if (
          existingLink.link_status === "linked" &&
          existingLink.master_recipe_id
        ) {
          // User already has this source linked - return the existing master recipe
          const { data: existingMaster } = await supabaseAdmin
            .from("master_recipes")
            .select("id, title")
            .eq("id", existingLink.master_recipe_id)
            .single();

          return new Response(
            JSON.stringify({
              success: true,
              already_imported: true,
              master_recipe_id: existingLink.master_recipe_id,
              recipe: existingMaster,
              message: "This video has already been imported to your library.",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (existingLink.link_status === "pending") {
          // User has a pending link - update it with fresh extraction data first
          // This ensures confirm-source-link gets the latest extracted data
          await supabaseAdmin
            .from("recipe_source_links")
            .update({
              extracted_ingredients: ingredientsJson,
              extracted_steps: stepsJson,
              extracted_title: recipe.title,
              extracted_description: recipe.description,
              extracted_mode: recipe.mode,
              extracted_cuisine: recipe.cuisine,
              extraction_confidence: confidence,
            })
            .eq("id", existingLink.id);

          const similarRecipes = await findSimilarMasterRecipes(
            supabaseAdmin,
            user.id,
            recipe.title,
            recipe.mode
          );

          await logExtraction(supabaseAdmin, {
            platform: platform !== "unknown" ? platform : "manual",
            source_url: sourceUrl,
            extraction_method: extractionMethod,
            extraction_layer: extractionLayer,
            success: true,
            duration_ms: Date.now() - startTime,
          });

          if (similarRecipes.length > 0) {
            return new Response(
              JSON.stringify({
                success: true,
                needs_confirmation: true,
                source_link_id: existingLink.id,
                extracted_recipe: {
                  title: recipe.title,
                  description: recipe.description,
                  mode: recipe.mode,
                  cuisine: recipe.cuisine,
                  ingredients_count: ingredients.length,
                  steps_count: steps.length,
                },
                similar_recipes: similarRecipes,
                message:
                  "We found similar recipes in your library. Would you like to add this as a new source to an existing recipe?",
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          // No similar recipes - auto-create master recipe from the existing pending link
          // Continue to Step 6 below, but use existing link ID
          // We'll handle this by setting sourceLinkId to existing link
          // and skipping the insert step
        }
      }
    }

    // Step 4: Create recipe_source_link with extracted data

    let sourceLinkId: string | null = null;
    let existingPendingLinkId: string | null = null;

    // Check for existing pending link before trying to insert
    if (videoSourceId) {
      const { data: existingPendingLink } = await supabaseAdmin
        .from("recipe_source_links")
        .select("id")
        .eq("user_id", user.id)
        .eq("video_source_id", videoSourceId)
        .eq("link_status", "pending")
        .single();

      if (existingPendingLink) {
        // Reuse the existing pending link instead of inserting
        existingPendingLinkId = existingPendingLink.id;
        sourceLinkId = existingPendingLink.id;

        // Update the existing pending link with fresh extraction data
        await supabaseAdmin
          .from("recipe_source_links")
          .update({
            extracted_ingredients: ingredientsJson,
            extracted_steps: stepsJson,
            extracted_title: recipe.title,
            extracted_description: recipe.description,
            extracted_mode: recipe.mode,
            extracted_cuisine: recipe.cuisine,
            extraction_confidence: confidence,
          })
          .eq("id", existingPendingLink.id);
      } else {
        // No existing pending link, create a new one
        const { data: sourceLink, error: linkError } = await supabaseAdmin
          .from("recipe_source_links")
          .insert({
            video_source_id: videoSourceId,
            user_id: user.id,
            extracted_ingredients: ingredientsJson,
            extracted_steps: stepsJson,
            extracted_title: recipe.title,
            extracted_description: recipe.description,
            extracted_mode: recipe.mode,
            extracted_cuisine: recipe.cuisine,
            extraction_confidence: confidence,
            link_status: "pending",
          })
          .select("id")
          .single();

        if (linkError) {
          console.error("Failed to create source link:", linkError);
          throw new Error(`Failed to create source link: ${linkError.message}`);
        }
        sourceLinkId = sourceLink.id;
      }
    }

    // Step 5: Check for similar existing master recipes
    // Skip similarity check for manual entries - they always create new recipes
    // because we can't link them to video sources anyway
    if (!isManualEntry) {
      const similarRecipes = await findSimilarMasterRecipes(
        supabaseAdmin,
        user.id,
        recipe.title,
        recipe.mode
      );

      if (similarRecipes.length > 0) {
        // Found similar recipes - ask user to confirm
        await logExtraction(supabaseAdmin, {
          platform: platform !== "unknown" ? platform : "manual",
          source_url: sourceUrl,
          extraction_method: extractionMethod,
          extraction_layer: extractionLayer,
          success: true,
          duration_ms: Date.now() - startTime,
        });

        return new Response(
          JSON.stringify({
            success: true,
            needs_confirmation: true,
            source_link_id: sourceLinkId,
            extracted_recipe: {
              title: recipe.title,
              description: recipe.description,
              mode: recipe.mode,
              cuisine: recipe.cuisine,
              ingredients_count: ingredients.length,
              steps_count: steps.length,
            },
            similar_recipes: similarRecipes,
            message:
              "We found similar recipes in your library. Would you like to add this as a new source to an existing recipe?",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Step 6: No similar recipes - auto-create master recipe + version
    const { data: masterRecipe, error: masterError } = await supabaseAdmin
      .from("master_recipes")
      .insert({
        user_id: user.id,
        title: recipe.title,
        description: recipe.description,
        mode: recipe.mode,
        cuisine: recipe.cuisine,
        category: recipe.category,
        cover_video_source_id: null, // Will set after linking
      })
      .select("id")
      .single();

    if (masterError) {
      console.error("Failed to create master recipe:", masterError);
      throw new Error(`Failed to create master recipe: ${masterError.message}`);
    }

    // Create initial version (v1)
    const { data: version, error: versionError } = await supabaseAdmin
      .from("master_recipe_versions")
      .insert({
        master_recipe_id: masterRecipe.id,
        version_number: 1,
        title: recipe.title,
        description: recipe.description,
        mode: recipe.mode,
        cuisine: recipe.cuisine,
        category: recipe.category,
        prep_time_minutes: recipe.prep_time_minutes,
        cook_time_minutes: recipe.cook_time_minutes,
        servings: recipe.servings,
        servings_unit: recipe.servings_unit,
        difficulty_score: recipe.difficulty_score,
        ingredients: ingredientsJson,
        steps: stepsJson,
        based_on_source_id: sourceLinkId,
        change_notes: "Initial import from video",
      })
      .select("id")
      .single();

    if (versionError) {
      console.error("Failed to create version:", versionError);
      // Cleanup master recipe
      await supabaseAdmin
        .from("master_recipes")
        .delete()
        .eq("id", masterRecipe.id);
      throw new Error(`Failed to create version: ${versionError.message}`);
    }

    // Update master recipe with current_version_id and cover_video_source_id
    // Note: We need to link the source first before setting cover
    if (sourceLinkId) {
      await supabaseAdmin
        .from("recipe_source_links")
        .update({
          master_recipe_id: masterRecipe.id,
          link_status: "linked",
          linked_at: new Date().toISOString(),
        })
        .eq("id", sourceLinkId);
    }

    // Now we can set both current_version_id and cover_video_source_id
    await supabaseAdmin
      .from("master_recipes")
      .update({
        current_version_id: version.id,
        cover_video_source_id: videoSourceId,
      })
      .eq("id", masterRecipe.id);

    // Increment import count
    await supabaseAdmin
      .from("users")
      .update({ imports_this_month: currentImports + 1 })
      .eq("id", user.id);

    await logExtraction(supabaseAdmin, {
      platform: platform !== "unknown" ? platform : "manual",
      source_url: sourceUrl,
      extraction_method: extractionMethod,
      extraction_layer: extractionLayer,
      success: true,
      duration_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        master_recipe_id: masterRecipe.id,
        version_id: version.id,
        source_link_id: sourceLinkId,
        recipe: {
          id: masterRecipe.id,
          title: recipe.title,
          description: recipe.description,
          mode: recipe.mode,
        },
        extraction: {
          method: extraction.method,
          layer: extraction.layer,
          confidence,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);

    await logExtraction(supabaseAdmin, {
      platform: platform !== "unknown" ? platform : "unknown",
      source_url: sourceUrl || "unknown",
      extraction_method: extractionMethod,
      extraction_layer: extractionLayer,
      success: false,
      error_message:
        error instanceof Error ? error.message : "Unknown error occurred",
      duration_ms: Date.now() - startTime,
    });

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
