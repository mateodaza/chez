/* eslint-disable no-console */
/**
 * Backfill Script: Generate embeddings for existing memories/knowledge without them
 *
 * Usage:
 *   pnpm tsx supabase/seed/backfill-embeddings.ts [--knowledge] [--memories]
 *
 * Options:
 *   --knowledge  Backfill recipe_knowledge embeddings
 *   --memories   Backfill user_cooking_memory embeddings
 *   (no options) Backfill both
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

// Load .env manually
function loadEnv() {
  const envPath = path.resolve(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=").replace(/^["']|["']$/g, "");
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

let supabase: SupabaseClient;
let openai: OpenAI;

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

async function backfillKnowledge() {
  console.log("\n📚 Backfilling recipe_knowledge embeddings...\n");

  // Find entries without embeddings
  const { data: entries, error } = await supabase
    .from("recipe_knowledge")
    .select("id, content")
    .is("embedding", null);

  if (error) {
    console.error("Failed to fetch:", error);
    return;
  }

  if (!entries || entries.length === 0) {
    console.log("   All recipe_knowledge entries already have embeddings!");
    return;
  }

  console.log(`   Found ${entries.length} entries without embeddings`);

  // Process in batches
  const BATCH_SIZE = 50;
  let processed = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const texts = batch.map((e) => e.content);

    console.log(
      `   Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(entries.length / BATCH_SIZE)}...`
    );

    const embeddings = await generateEmbeddingsBatch(texts);

    // Update each entry with its embedding
    for (let j = 0; j < batch.length; j++) {
      const { error: updateError } = await supabase
        .from("recipe_knowledge")
        .update({ embedding: embeddings[j] })
        .eq("id", batch[j].id);

      if (updateError) {
        console.error(`   Failed to update ${batch[j].id}:`, updateError);
      } else {
        processed++;
      }
    }
  }

  console.log(`   ✅ Updated ${processed}/${entries.length} entries`);
}

async function backfillMemories() {
  console.log("\n🧠 Backfilling user_cooking_memory embeddings...\n");

  // Find entries without embeddings
  const { data: entries, error } = await supabase
    .from("user_cooking_memory")
    .select("id, content")
    .is("embedding", null);

  if (error) {
    console.error("Failed to fetch:", error);
    return;
  }

  if (!entries || entries.length === 0) {
    console.log("   All user_cooking_memory entries already have embeddings!");
    return;
  }

  console.log(`   Found ${entries.length} entries without embeddings`);

  // Process in batches
  const BATCH_SIZE = 50;
  let processed = 0;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const texts = batch.map((e) => e.content);

    console.log(
      `   Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(entries.length / BATCH_SIZE)}...`
    );

    const embeddings = await generateEmbeddingsBatch(texts);

    // Update each entry with its embedding
    for (let j = 0; j < batch.length; j++) {
      const { error: updateError } = await supabase
        .from("user_cooking_memory")
        .update({ embedding: embeddings[j] })
        .eq("id", batch[j].id);

      if (updateError) {
        console.error(`   Failed to update ${batch[j].id}:`, updateError);
      } else {
        processed++;
      }
    }
  }

  console.log(`   ✅ Updated ${processed}/${entries.length} entries`);
}

async function main() {
  // Initialize clients
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing environment variables:");
    if (!SUPABASE_URL)
      console.error("   - EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL");
    if (!SUPABASE_SERVICE_KEY)
      console.error(
        "   - SUPABASE_SERVICE_ROLE_KEY (get from Dashboard → Settings → API)"
      );
    console.error("\nAdd these to your .env file");
    process.exit(1);
  }

  if (!OPENAI_API_KEY) {
    console.error("❌ Missing OPENAI_API_KEY");
    console.error(
      "   Get your API key from: https://platform.openai.com/api-keys"
    );
    process.exit(1);
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const args = process.argv.slice(2);
  const doKnowledge = args.length === 0 || args.includes("--knowledge");
  const doMemories = args.length === 0 || args.includes("--memories");

  console.log("\n🍳 Chez Embedding Backfill\n");

  if (doKnowledge) await backfillKnowledge();
  if (doMemories) await backfillMemories();

  console.log("\n✅ Backfill complete!\n");
}

main().catch(console.error);
