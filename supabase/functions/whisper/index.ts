import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const { audio } = await req.json();
    if (!audio) {
      throw new Error("No audio data provided");
    }

    // Convert base64 to binary
    const binaryAudio = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));

    // Create form data for Whisper API
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([binaryAudio], { type: "audio/m4a" }),
      "recording.m4a"
    );
    formData.append("model", "whisper-1");
    formData.append("language", "en");

    // Call OpenAI Whisper API
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Whisper API error:", errorText);
      throw new Error(`Whisper API error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({ text: data.text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Whisper error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Transcription failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
