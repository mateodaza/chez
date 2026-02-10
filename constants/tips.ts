/**
 * Tips for loading screens
 * Mix of cooking knowledge and app feature discoveries
 *
 * FUTURE ENHANCEMENT: Database-backed tips
 * =========================================
 * Plan to migrate tips to Supabase for dynamic updates:
 *
 * 1. CREATE TABLE tips (
 *      id uuid PRIMARY KEY,
 *      category text NOT NULL, -- 'cooking' | 'technique' | 'ingredient' | 'app'
 *      icon text NOT NULL,
 *      title text NOT NULL,
 *      content text NOT NULL,
 *      mode text, -- 'cooking' | 'mixology' | 'pastry' | null
 *      is_active boolean DEFAULT true,
 *      view_count int DEFAULT 0,
 *      created_at timestamptz DEFAULT now(),
 *      source text -- 'seed' | 'ai_generated' | 'manual'
 *    );
 *
 * 2. Seed with current hardcoded tips
 *
 * 3. Edge function to generate new tips periodically:
 *    - Run weekly via cron
 *    - Use Claude to generate 3-5 new tips
 *    - Mix of cooking tips and app feature tips
 *    - Auto-activate after review (or manual review flow)
 *
 * 4. Good moments to update tips:
 *    - After new feature launches (app tips)
 *    - Seasonally (seasonal cooking tips)
 *    - Based on popular recipe modes (more mixology tips if users import cocktails)
 *
 * 5. Client fetches tips on app start, caches locally
 *    - Fallback to hardcoded tips if offline/error
 */

export interface Tip {
  id: string;
  category: "cooking" | "technique" | "ingredient" | "app";
  icon: string; // Ionicons name
  title: string;
  content: string;
  mode?: "cooking" | "mixology" | "pastry"; // Optional mode filter
}

export const COOKING_TIPS: Tip[] = [
  // Technique tips
  {
    id: "salt-pasta-water",
    category: "technique",
    icon: "water-outline",
    title: "Pasta Water Secret",
    content:
      "Salt your pasta water until it tastes like the sea - about 1 tbsp per quart. It's your only chance to season the pasta itself.",
    mode: "cooking",
  },
  {
    id: "rest-meat",
    category: "technique",
    icon: "time-outline",
    title: "Let It Rest",
    content:
      "Rest meat for 5-10 minutes after cooking. The juices redistribute, making every bite more flavorful.",
    mode: "cooking",
  },
  {
    id: "hot-pan-cold-oil",
    category: "technique",
    icon: "flame-outline",
    title: "Hot Pan, Cold Oil",
    content:
      "Heat your pan first, then add oil. When the oil shimmers, you're ready to cook. This prevents sticking.",
    mode: "cooking",
  },
  {
    id: "dont-crowd-pan",
    category: "technique",
    icon: "resize-outline",
    title: "Give It Space",
    content:
      "Don't crowd the pan! Overcrowding causes steaming instead of browning. Cook in batches for better results.",
    mode: "cooking",
  },
  {
    id: "mise-en-place",
    category: "technique",
    icon: "grid-outline",
    title: "Mise en Place",
    content:
      "Prep all ingredients before you start cooking. Professional chefs call this 'mise en place' - everything in its place.",
  },
  {
    id: "taste-as-you-go",
    category: "technique",
    icon: "restaurant-outline",
    title: "Taste As You Go",
    content:
      "The best chefs taste constantly. Adjust seasoning throughout cooking, not just at the end.",
  },
  {
    id: "acid-brightness",
    category: "technique",
    icon: "sunny-outline",
    title: "Add Brightness",
    content:
      "Dish tastes flat? A squeeze of lemon or splash of vinegar at the end can transform it. Acid adds brightness.",
    mode: "cooking",
  },
  {
    id: "sharp-knife",
    category: "technique",
    icon: "cut-outline",
    title: "Sharp Knife = Safe Knife",
    content:
      "A sharp knife is safer than a dull one. Dull knives slip and require more force, increasing accident risk.",
  },

  // Ingredient tips
  {
    id: "room-temp-eggs",
    category: "ingredient",
    icon: "egg-outline",
    title: "Room Temperature Eggs",
    content:
      "For baking, room temperature eggs mix better and create a more uniform texture. Take them out 30 min early.",
    mode: "pastry",
  },
  {
    id: "kosher-salt",
    category: "ingredient",
    icon: "sparkles-outline",
    title: "Kosher vs Table Salt",
    content:
      "Kosher salt is less salty by volume than table salt. If substituting, use about half the amount of table salt.",
  },
  {
    id: "freeze-ginger",
    category: "ingredient",
    icon: "snow-outline",
    title: "Freeze Your Ginger",
    content:
      "Freeze fresh ginger - it grates easier when frozen and lasts for months. No need to peel first!",
  },
  {
    id: "garlic-timing",
    category: "ingredient",
    icon: "leaf-outline",
    title: "Garlic Timing",
    content:
      "Add garlic later than onions - it burns quickly. 30-60 seconds until fragrant is usually enough.",
    mode: "cooking",
  },
  {
    id: "butter-temperature",
    category: "ingredient",
    icon: "cube-outline",
    title: "Butter Temperature Matters",
    content:
      "For flaky pastry, use cold butter. For creaming (cookies, cakes), use room temperature butter that dents when pressed.",
    mode: "pastry",
  },
  {
    id: "bloom-spices",
    category: "ingredient",
    icon: "color-palette-outline",
    title: "Bloom Your Spices",
    content:
      "Toast ground spices in oil for 30-60 seconds before adding liquids. This 'blooming' releases more flavor.",
    mode: "cooking",
  },
  {
    id: "citrus-zest",
    category: "ingredient",
    icon: "nutrition-outline",
    title: "Zest Before Juice",
    content:
      "Always zest citrus before juicing - it's much easier on a whole fruit. The zest holds most of the aromatic oils.",
  },

  // Mixology tips
  {
    id: "shake-citrus",
    category: "technique",
    icon: "wine-outline",
    title: "Shake with Citrus",
    content:
      "Shake cocktails with citrus juice, stir spirit-only drinks. Shaking adds dilution and aeration that citrus cocktails need.",
    mode: "mixology",
  },
  {
    id: "fresh-juice",
    category: "ingredient",
    icon: "leaf-outline",
    title: "Fresh Juice Only",
    content:
      "For cocktails, always use fresh citrus juice. Bottled juice oxidizes and tastes flat. Squeeze it the same day.",
    mode: "mixology",
  },
  {
    id: "ice-matters",
    category: "technique",
    icon: "snow-outline",
    title: "Ice Quality Matters",
    content:
      "Good ice = good cocktail. Large, clear ice cubes melt slower, keeping your drink cold without over-diluting.",
    mode: "mixology",
  },
  {
    id: "dry-shake",
    category: "technique",
    icon: "sync-outline",
    title: "Dry Shake for Foam",
    content:
      "For egg white cocktails, shake without ice first (dry shake) to build foam, then add ice and shake again.",
    mode: "mixology",
  },

  // Pastry tips
  {
    id: "cold-everything",
    category: "technique",
    icon: "snow-outline",
    title: "Keep It Cold",
    content:
      "For flaky pie crust, keep butter, water, and even your bowl cold. Warm butter = tough, dense pastry.",
    mode: "pastry",
  },
  {
    id: "dont-overmix",
    category: "technique",
    icon: "hand-left-outline",
    title: "Don't Overmix",
    content:
      "Overmixing develops gluten, making baked goods tough. Mix until just combined - some lumps are okay!",
    mode: "pastry",
  },
  {
    id: "oven-thermometer",
    category: "technique",
    icon: "thermometer-outline",
    title: "Trust a Thermometer",
    content:
      "Oven temperatures can be off by 25-50°F. An oven thermometer is a baker's best friend.",
    mode: "pastry",
  },
];

export const APP_TIPS: Tip[] = [
  {
    id: "app-create-from-idea",
    category: "app",
    icon: "bulb-outline",
    title: "Create from Ideas",
    content:
      "Just type 'pasta with tomatoes' and our AI will generate a complete recipe with ingredients and steps!",
  },
  {
    id: "app-import-video",
    category: "app",
    icon: "videocam-outline",
    title: "Import from Videos",
    content:
      "Paste a YouTube, TikTok, or Instagram recipe video link - we'll extract the full recipe automatically.",
  },
  {
    id: "app-cook-mode",
    category: "app",
    icon: "flame-outline",
    title: "Hands-Free Cooking",
    content:
      "In cook mode, ask Chef AI anything! 'Can I substitute this?' or 'How do I know when it's done?'",
  },
  {
    id: "app-save-cookbook",
    category: "app",
    icon: "bookmark-outline",
    title: "Your Personal Cookbook",
    content:
      "Save any recipe to your cookbook to customize it. Your changes are saved as your personal version.",
  },
  {
    id: "app-grocery-list",
    category: "app",
    icon: "cart-outline",
    title: "Smart Grocery Lists",
    content:
      "Send ingredients to your grocery list with one tap. Items are automatically organized by category.",
  },
  {
    id: "app-chef-ai-learns",
    category: "app",
    icon: "sparkles-outline",
    title: "Chef AI Remembers",
    content:
      "Tell Chef AI your preferences while cooking - 'I used pancetta instead' - and it remembers for next time!",
  },
  {
    id: "app-multi-source",
    category: "app",
    icon: "git-merge-outline",
    title: "Multiple Sources",
    content:
      "Import the same recipe from different creators. Compare techniques and find your favorite version!",
  },
  {
    id: "app-edit-anytime",
    category: "app",
    icon: "create-outline",
    title: "Edit Anytime",
    content:
      "Tap Edit on any cookbook recipe to adjust ingredients, steps, or times. Make it your own!",
  },
  {
    id: "app-voice-commands",
    category: "app",
    icon: "mic-outline",
    title: "Voice Commands",
    content:
      "In cook mode, use voice to ask questions and control timers. Perfect for messy hands!",
  },
  {
    id: "app-scaling",
    category: "app",
    icon: "resize-outline",
    title: "Scale Recipes",
    content:
      "Cooking for more people? Ask Chef AI to scale the recipe and it'll adjust all quantities.",
  },
];

// Combined tips for general use
export const ALL_TIPS: Tip[] = [...COOKING_TIPS, ...APP_TIPS];

// Get random tips, optionally filtered by mode
export function getRandomTips(
  count: number,
  mode?: "cooking" | "mixology" | "pastry"
): Tip[] {
  let tips = [...ALL_TIPS];

  // Filter by mode if specified (keep general tips + mode-specific)
  if (mode) {
    tips = tips.filter((tip) => !tip.mode || tip.mode === mode);
  }

  // Shuffle
  for (let i = tips.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tips[i], tips[j]] = [tips[j], tips[i]];
  }

  return tips.slice(0, count);
}

// Get a single random tip
export function getRandomTip(mode?: "cooking" | "mixology" | "pastry"): Tip {
  return getRandomTips(1, mode)[0];
}

// Progress messages for different loading states
export const PROGRESS_MESSAGES = {
  import: [
    { message: "Reading video...", icon: "videocam-outline" },
    { message: "Extracting transcript...", icon: "document-text-outline" },
    { message: "Finding ingredients...", icon: "nutrition-outline" },
    { message: "Organizing steps...", icon: "list-outline" },
    { message: "Almost ready...", icon: "checkmark-circle-outline" },
  ],
  create: [
    { message: "Processing recipe...", icon: "sparkles-outline" },
    { message: "Identifying ingredients...", icon: "nutrition-outline" },
    { message: "Structuring steps...", icon: "list-outline" },
    { message: "Adding details...", icon: "create-outline" },
    { message: "Almost ready...", icon: "checkmark-circle-outline" },
  ],
  save: [
    { message: "Saving changes...", icon: "save-outline" },
    { message: "Updating recipe...", icon: "sync-outline" },
  ],
  cook: [
    { message: "Loading recipe...", icon: "restaurant-outline" },
    { message: "Setting up your kitchen...", icon: "flame-outline" },
    { message: "Preparing your steps...", icon: "list-outline" },
    { message: "Almost ready to cook...", icon: "checkmark-circle-outline" },
  ],
};
