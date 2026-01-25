/**
 * Seed Script: Generate embeddings and populate recipe_knowledge table
 *
 * Usage:
 *   npx tsx supabase/seed/seed-knowledge.ts
 *
 * Requirements:
 *   - OPENAI_API_KEY environment variable
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 *     (or use .env file in project root)
 *
 * Options:
 *   --wipe    Clear all existing knowledge before seeding
 *   --dry-run Print what would be inserted without actually inserting
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

// Load .env manually (no top-level await needed)
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

// Load knowledge data
const knowledgePath = path.resolve(__dirname, "./knowledge.json");
const knowledgeData = JSON.parse(fs.readFileSync(knowledgePath, "utf-8"));

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

let supabase: SupabaseClient;
let openai: OpenAI;

const args = process.argv.slice(2);
const shouldWipe = args.includes("--wipe");
const dryRun = args.includes("--dry-run");

interface KnowledgeEntry {
  doc_type: string;
  content: string;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  // OpenAI supports batch embedding - more efficient
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

async function main() {
  // Initialize clients inside main to ensure env is loaded
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
    console.error("\nAdd to your .env file: OPENAI_API_KEY=sk-...");
    process.exit(1);
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  console.log(`\n🍳 Chez Knowledge Seeder\n`);
  console.log(`Found ${knowledgeData.length} knowledge entries to seed`);

  if (dryRun) {
    console.log("\n🔍 DRY RUN - No changes will be made\n");
    for (const entry of knowledgeData as KnowledgeEntry[]) {
      console.log(`  [${entry.doc_type}] ${entry.content.slice(0, 60)}...`);
    }
    console.log("\n✅ Dry run complete");
    return;
  }

  // Check existing entries
  const { count: existingCount } = await supabase
    .from("recipe_knowledge")
    .select("*", { count: "exact", head: true });

  console.log(`Existing entries in database: ${existingCount || 0}`);

  if (shouldWipe && existingCount && existingCount > 0) {
    console.log("\n🗑️  Wiping existing knowledge...");
    const { error: deleteError } = await supabase
      .from("recipe_knowledge")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (deleteError) {
      console.error("Failed to wipe:", deleteError);
      process.exit(1);
    }
    console.log("Wiped successfully");
  }

  // Generate embeddings in batches (OpenAI handles batching efficiently)
  console.log("\n🔄 Generating embeddings via OpenAI...");
  const texts = (knowledgeData as KnowledgeEntry[]).map((e) => e.content);

  // Process in chunks of 100 to avoid rate limits
  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(
      `  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)}...`
    );
    const embeddings = await generateEmbeddingsBatch(batch);
    allEmbeddings.push(...embeddings);
  }

  console.log(`Generated ${allEmbeddings.length} embeddings`);

  // Prepare records for upsert
  const records = (knowledgeData as KnowledgeEntry[]).map((entry, i) => ({
    doc_type: entry.doc_type,
    content: entry.content,
    embedding: allEmbeddings[i],
  }));

  // Insert into database
  console.log("\n📥 Inserting into recipe_knowledge...");

  // Insert records - duplicates will be rejected by unique constraint on md5(content)
  // Use individual inserts to handle duplicates gracefully
  let inserted = 0;
  let skipped = 0;

  for (const record of records) {
    const { error } = await supabase.from("recipe_knowledge").insert(record);

    if (error) {
      if (
        error.message.includes("duplicate") ||
        error.message.includes("unique")
      ) {
        skipped++;
      } else {
        console.error("Insert failed:", error);
        process.exit(1);
      }
    } else {
      inserted++;
    }
  }

  console.log(`   Inserted: ${inserted}, Skipped (duplicates): ${skipped}`);

  // Verify
  const { count: finalCount } = await supabase
    .from("recipe_knowledge")
    .select("*", { count: "exact", head: true });

  console.log(`\n✅ Seeding complete!`);
  console.log(`   Total entries in recipe_knowledge: ${finalCount}`);

  // Show breakdown by type
  const { data: breakdown } = await supabase.rpc("get_knowledge_breakdown");
  if (!breakdown) {
    // Manual breakdown if RPC doesn't exist
    const types = ["tip", "technique", "substitution", "ingredient_info"];
    console.log("\n   Breakdown by type:");
    for (const t of types) {
      const { count } = await supabase
        .from("recipe_knowledge")
        .select("*", { count: "exact", head: true })
        .eq("doc_type", t);
      console.log(`     ${t}: ${count}`);
    }
  }
}

main().catch(console.error);
