/**
 * Recipe Import Flow Tests
 *
 * Coverage:
 * - Platform detection (URL parsing for YouTube, TikTok, Instagram)
 * - Import response classification (success, already_imported, needs_confirmation, upgrade_required, error)
 * - Confirmation action logic (create_new, link_existing, reject)
 * - extracted_metadata propagation through confirm-source-link
 * - Import limit enforcement (free: 3/month, chef: unlimited)
 * - Monthly reset logic
 */

import {
  detectPlatform,
  getPlatformDisplayName,
  getPlatformIcon,
} from "../../lib/extraction/platform-detector";

import type {
  ImportSuccessResponse,
  ImportNeedsConfirmationResponse,
  ImportUpgradeRequiredResponse,
  ImportErrorResponse,
  ImportResponse,
  ConfirmLinkResponse,
} from "../../types/database";

// ─── Platform Detection ───────────────────────────────────────────

describe("Platform Detection", () => {
  describe("YouTube URLs", () => {
    it("detects standard youtube.com/watch?v= URLs", () => {
      const result = detectPlatform(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
      expect(result.platform).toBe("youtube");
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe("dQw4w9WgXcQ");
      expect(result.normalizedUrl).toBe(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
    });

    it("detects youtu.be short URLs", () => {
      const result = detectPlatform("https://youtu.be/dQw4w9WgXcQ");
      expect(result.platform).toBe("youtube");
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe("dQw4w9WgXcQ");
    });

    it("detects YouTube Shorts URLs", () => {
      const result = detectPlatform(
        "https://www.youtube.com/shorts/dQw4w9WgXcQ"
      );
      expect(result.platform).toBe("youtube");
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe("dQw4w9WgXcQ");
    });

    it("detects YouTube embed URLs", () => {
      const result = detectPlatform(
        "https://www.youtube.com/embed/dQw4w9WgXcQ"
      );
      expect(result.platform).toBe("youtube");
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe("dQw4w9WgXcQ");
    });

    it("handles YouTube URLs without protocol", () => {
      const result = detectPlatform("youtube.com/watch?v=dQw4w9WgXcQ");
      expect(result.platform).toBe("youtube");
      expect(result.isValid).toBe(true);
    });

    it("handles YouTube URLs with extra query params", () => {
      const result = detectPlatform(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120&list=PLxyz"
      );
      expect(result.platform).toBe("youtube");
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe("dQw4w9WgXcQ");
    });

    it("rejects unrecognized YouTube format", () => {
      const result = detectPlatform("https://www.youtube.com/channel/UCxyz");
      expect(result.platform).toBe("youtube");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Could not extract YouTube video ID");
    });
  });

  describe("TikTok URLs", () => {
    it("detects standard desktop TikTok URLs", () => {
      const result = detectPlatform(
        "https://www.tiktok.com/@user/video/1234567890123456789"
      );
      expect(result.platform).toBe("tiktok");
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe("1234567890123456789");
    });

    it("detects vm.tiktok.com share links", () => {
      const result = detectPlatform("https://vm.tiktok.com/ZMrABC123/");
      expect(result.platform).toBe("tiktok");
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe("ZMrABC123");
    });

    it("detects vt.tiktok.com share links (Asia)", () => {
      const result = detectPlatform("https://vt.tiktok.com/ZSrXYZ789/");
      expect(result.platform).toBe("tiktok");
      expect(result.isValid).toBe(true);
    });

    it("detects tiktok.com/t/ short links", () => {
      const result = detectPlatform("https://www.tiktok.com/t/ZTRaBcD/");
      expect(result.platform).toBe("tiktok");
      expect(result.isValid).toBe(true);
    });

    it("detects mobile TikTok URLs", () => {
      const result = detectPlatform(
        "https://m.tiktok.com/v/1234567890123456789.html"
      );
      expect(result.platform).toBe("tiktok");
      expect(result.isValid).toBe(true);
    });

    it("handles TikTok usernames with dots and hyphens", () => {
      const result = detectPlatform(
        "https://www.tiktok.com/@chef.name-123/video/9876543210987654321"
      );
      expect(result.platform).toBe("tiktok");
      expect(result.isValid).toBe(true);
    });
  });

  describe("Instagram URLs", () => {
    it("detects Instagram Reels", () => {
      const result = detectPlatform(
        "https://www.instagram.com/reel/CxYz123AbCd/"
      );
      expect(result.platform).toBe("instagram");
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe("CxYz123AbCd");
    });

    it("detects Instagram Posts", () => {
      const result = detectPlatform("https://www.instagram.com/p/CxYz123AbCd/");
      expect(result.platform).toBe("instagram");
      expect(result.isValid).toBe(true);
    });

    it("detects instagr.am short URLs", () => {
      const result = detectPlatform("https://instagr.am/reel/CxYz123AbCd/");
      expect(result.platform).toBe("instagram");
      expect(result.isValid).toBe(true);
    });

    it("rejects Instagram profile URLs", () => {
      const result = detectPlatform("https://www.instagram.com/username/");
      expect(result.platform).toBe("instagram");
      expect(result.isValid).toBe(false);
    });
  });

  describe("Unsupported & Invalid URLs", () => {
    it("rejects completely invalid strings", () => {
      const result = detectPlatform("not a url at all");
      expect(result.isValid).toBe(false);
      expect(result.platform).toBe("unknown");
    });

    it("rejects unsupported platforms", () => {
      const result = detectPlatform("https://www.twitter.com/some-post");
      expect(result.platform).toBe("unknown");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Unsupported platform");
    });

    it("rejects generic URLs", () => {
      const result = detectPlatform("https://www.google.com");
      expect(result.platform).toBe("unknown");
      expect(result.isValid).toBe(false);
    });

    it("handles empty strings", () => {
      const result = detectPlatform("");
      expect(result.isValid).toBe(false);
    });

    it("handles whitespace-padded URLs", () => {
      const result = detectPlatform(
        "  https://www.youtube.com/watch?v=dQw4w9WgXcQ  "
      );
      expect(result.platform).toBe("youtube");
      expect(result.isValid).toBe(true);
    });
  });

  describe("Platform display helpers", () => {
    it("returns correct display names", () => {
      expect(getPlatformDisplayName("youtube")).toBe("YouTube");
      expect(getPlatformDisplayName("tiktok")).toBe("TikTok");
      expect(getPlatformDisplayName("instagram")).toBe("Instagram");
      expect(getPlatformDisplayName("unknown")).toBe("Unknown");
    });

    it("returns correct platform icons", () => {
      expect(getPlatformIcon("youtube")).toBe("logo-youtube");
      expect(getPlatformIcon("tiktok")).toBe("musical-notes");
      expect(getPlatformIcon("instagram")).toBe("logo-instagram");
      expect(getPlatformIcon("unknown")).toBe("link");
    });
  });
});

// ─── Import Response Handling ─────────────────────────────────────

describe("Import Response Classification", () => {
  const classifyResponse = (
    data: ImportResponse
  ):
    | "success"
    | "already_imported"
    | "needs_confirmation"
    | "upgrade_required"
    | "fallback"
    | "error" => {
    if (!data.success) {
      if ("upgrade_required" in data && data.upgrade_required)
        return "upgrade_required";
      if ("fallback_mode" in data && data.fallback_mode) return "fallback";
      return "error";
    }
    if ("needs_confirmation" in data && data.needs_confirmation)
      return "needs_confirmation";
    if ("already_imported" in data && data.already_imported)
      return "already_imported";
    return "success";
  };

  it("classifies a fresh import success", () => {
    const response: ImportSuccessResponse = {
      success: true,
      master_recipe_id: "recipe-1",
      version_id: "version-1",
      source_link_id: "link-1",
      recipe: {
        title: "Pasta Carbonara",
        description: "Classic Italian pasta",
        mode: "cooking",
        cuisine: "Italian",
      },
    };
    expect(classifyResponse(response)).toBe("success");
  });

  it("classifies an already-imported response", () => {
    const response: ImportSuccessResponse = {
      success: true,
      master_recipe_id: "recipe-1",
      version_id: "version-1",
      source_link_id: "link-1",
      recipe: {
        title: "Pasta Carbonara",
        description: null,
        mode: "cooking",
        cuisine: null,
      },
      already_imported: true,
    };
    expect(classifyResponse(response)).toBe("already_imported");
  });

  it("classifies a needs-confirmation response (duplicate detected)", () => {
    const response: ImportNeedsConfirmationResponse = {
      success: true,
      needs_confirmation: true,
      source_link_id: "link-1",
      extracted_recipe: {
        title: "Pasta Carbonara",
        description: null,
        mode: "cooking",
        cuisine: "Italian",
        ingredients_count: 6,
        steps_count: 4,
      },
      similar_recipes: [
        {
          id: "recipe-existing",
          title: "Carbonara",
          mode: "cooking",
          source_count: 1,
          times_cooked: 3,
        },
      ],
    };
    expect(classifyResponse(response)).toBe("needs_confirmation");
  });

  it("classifies an upgrade-required response", () => {
    const response: ImportUpgradeRequiredResponse = {
      success: false,
      upgrade_required: true,
      message: "You've reached your monthly import limit (3 recipes).",
      resets_at: "2025-03-01T00:00:00.000Z",
    };
    expect(classifyResponse(response)).toBe("upgrade_required");
  });

  it("classifies a generic error response", () => {
    const response: ImportErrorResponse = {
      success: false,
      error: "Failed to extract recipe from video",
    };
    expect(classifyResponse(response)).toBe("error");
  });

  it("classifies a fallback response", () => {
    const response: ImportResponse = {
      success: false,
      fallback_mode: true,
      message: "Could not auto-extract this video",
      manual_fields: ["title", "ingredients", "steps"],
    };
    expect(classifyResponse(response)).toBe("fallback");
  });
});

// ─── Confirmation Flow Logic ──────────────────────────────────────

describe("Confirmation Flow", () => {
  describe("extracted_metadata propagation", () => {
    // Simulate what confirm-source-link does when creating a new recipe
    const buildVersionFromSourceLink = (sourceLink: {
      extracted_title: string;
      extracted_description: string | null;
      extracted_mode: string;
      extracted_cuisine: string | null;
      extracted_ingredients: unknown[];
      extracted_steps: unknown[];
      extracted_metadata: Record<string, unknown> | null;
    }) => {
      const meta = sourceLink.extracted_metadata || {};
      return {
        title: sourceLink.extracted_title,
        description: sourceLink.extracted_description,
        mode: sourceLink.extracted_mode,
        cuisine: sourceLink.extracted_cuisine,
        category: (meta.category as string) || null,
        prep_time_minutes: (meta.prep_time_minutes as number) || null,
        cook_time_minutes: (meta.cook_time_minutes as number) || null,
        servings: (meta.servings as number) || null,
        servings_unit: (meta.servings_unit as string) || null,
        difficulty_score: (meta.difficulty_score as number) || null,
        ingredients: sourceLink.extracted_ingredients,
        steps: sourceLink.extracted_steps,
      };
    };

    it("propagates all metadata fields to the version", () => {
      const sourceLink = {
        extracted_title: "Chicken Tikka Masala",
        extracted_description: "Creamy curry",
        extracted_mode: "cooking",
        extracted_cuisine: "Indian",
        extracted_ingredients: [{ id: "1", item: "chicken" }],
        extracted_steps: [{ id: "1", instruction: "Cook chicken" }],
        extracted_metadata: {
          prep_time_minutes: 20,
          cook_time_minutes: 35,
          servings: 4,
          servings_unit: "servings",
          difficulty_score: 3,
          category: "dinner",
        },
      };

      const version = buildVersionFromSourceLink(sourceLink);

      expect(version.title).toBe("Chicken Tikka Masala");
      expect(version.prep_time_minutes).toBe(20);
      expect(version.cook_time_minutes).toBe(35);
      expect(version.servings).toBe(4);
      expect(version.servings_unit).toBe("servings");
      expect(version.difficulty_score).toBe(3);
      expect(version.category).toBe("dinner");
    });

    it("handles missing extracted_metadata gracefully (null)", () => {
      const sourceLink = {
        extracted_title: "Simple Salad",
        extracted_description: null,
        extracted_mode: "cooking",
        extracted_cuisine: null,
        extracted_ingredients: [],
        extracted_steps: [],
        extracted_metadata: null,
      };

      const version = buildVersionFromSourceLink(sourceLink);

      expect(version.prep_time_minutes).toBeNull();
      expect(version.cook_time_minutes).toBeNull();
      expect(version.servings).toBeNull();
      expect(version.servings_unit).toBeNull();
      expect(version.difficulty_score).toBeNull();
      expect(version.category).toBeNull();
    });

    it("handles empty extracted_metadata ({})", () => {
      const sourceLink = {
        extracted_title: "Quick Snack",
        extracted_description: null,
        extracted_mode: "cooking",
        extracted_cuisine: null,
        extracted_ingredients: [],
        extracted_steps: [],
        extracted_metadata: {},
      };

      const version = buildVersionFromSourceLink(sourceLink);
      expect(version.prep_time_minutes).toBeNull();
      expect(version.category).toBeNull();
    });

    it("handles partial metadata (some fields present)", () => {
      const sourceLink = {
        extracted_title: "Quick Toast",
        extracted_description: null,
        extracted_mode: "cooking",
        extracted_cuisine: null,
        extracted_ingredients: [],
        extracted_steps: [],
        extracted_metadata: {
          prep_time_minutes: 5,
          // No cook_time, servings, etc.
        },
      };

      const version = buildVersionFromSourceLink(sourceLink);
      expect(version.prep_time_minutes).toBe(5);
      expect(version.cook_time_minutes).toBeNull();
      expect(version.servings).toBeNull();
    });
  });

  describe("Confirm action validation", () => {
    type ConfirmAction = "link_existing" | "create_new" | "reject";

    const validateConfirmRequest = (
      action: ConfirmAction,
      sourceLinkId: string | null,
      masterRecipeId?: string
    ): { valid: boolean; error?: string } => {
      if (!sourceLinkId || !action) {
        return {
          valid: false,
          error: "source_link_id and action are required",
        };
      }
      if (action === "link_existing" && !masterRecipeId) {
        return {
          valid: false,
          error: "master_recipe_id is required when linking to existing recipe",
        };
      }
      return { valid: true };
    };

    it("validates create_new action (no master_recipe_id needed)", () => {
      const result = validateConfirmRequest("create_new", "link-1");
      expect(result.valid).toBe(true);
    });

    it("validates link_existing with master_recipe_id", () => {
      const result = validateConfirmRequest(
        "link_existing",
        "link-1",
        "recipe-1"
      );
      expect(result.valid).toBe(true);
    });

    it("rejects link_existing without master_recipe_id", () => {
      const result = validateConfirmRequest("link_existing", "link-1");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("master_recipe_id is required");
    });

    it("validates reject action", () => {
      const result = validateConfirmRequest("reject", "link-1");
      expect(result.valid).toBe(true);
    });

    it("rejects missing source_link_id", () => {
      const result = validateConfirmRequest("create_new", null);
      expect(result.valid).toBe(false);
    });
  });

  describe("Confirm response handling", () => {
    const handleConfirmResponse = (
      data: ConfirmLinkResponse
    ): { navigateTo: string | null; error: string | null } => {
      if (!data.success) {
        if (data.upgrade_required) {
          return { navigateTo: null, error: "upgrade_required" };
        }
        return { navigateTo: null, error: data.error || "Unknown error" };
      }
      return {
        navigateTo: `/recipe/${data.master_recipe_id}`,
        error: null,
      };
    };

    it("navigates to recipe on success", () => {
      const response: ConfirmLinkResponse = {
        success: true,
        master_recipe_id: "recipe-123",
        version_id: "version-1",
        recipe: { title: "New Recipe" },
        message: 'Created new recipe "New Recipe"',
      };
      const result = handleConfirmResponse(response);
      expect(result.navigateTo).toBe("/recipe/recipe-123");
      expect(result.error).toBeNull();
    });

    it("returns upgrade_required on limit hit", () => {
      const response: ConfirmLinkResponse = {
        success: false,
        upgrade_required: true,
        message: "You've reached your monthly import limit.",
      };
      const result = handleConfirmResponse(response);
      expect(result.navigateTo).toBeNull();
      expect(result.error).toBe("upgrade_required");
    });

    it("returns error message on failure", () => {
      const response: ConfirmLinkResponse = {
        success: false,
        error: "Source link not found or already processed",
      };
      const result = handleConfirmResponse(response);
      expect(result.navigateTo).toBeNull();
      expect(result.error).toBe("Source link not found or already processed");
    });
  });
});

// ─── Import Limit Enforcement ─────────────────────────────────────

describe("Import Limit Enforcement", () => {
  // Mirror the logic from import-recipe and confirm-source-link
  const checkImportLimit = (
    tier: string,
    importsThisMonth: number,
    importsResetAt: string | null
  ): {
    allowed: boolean;
    currentImports: number;
    importsRemaining: number | null;
    needsReset: boolean;
  } => {
    const now = new Date();
    let currentImports = importsThisMonth;
    let needsReset = false;

    if (importsResetAt && now > new Date(importsResetAt)) {
      currentImports = 0;
      needsReset = true;
    }

    const isFree = tier === "free";
    const limit = 3;
    const allowed = !isFree || currentImports < limit;
    const importsRemaining = isFree
      ? Math.max(0, limit - (allowed ? currentImports + 1 : currentImports))
      : null;

    return { allowed, currentImports, importsRemaining, needsReset };
  };

  it("allows free user with 0 imports", () => {
    const result = checkImportLimit("free", 0, null);
    expect(result.allowed).toBe(true);
    expect(result.importsRemaining).toBe(2); // 3 - (0+1)
  });

  it("allows free user with 2 imports (last free)", () => {
    const result = checkImportLimit("free", 2, null);
    expect(result.allowed).toBe(true);
    expect(result.importsRemaining).toBe(0); // 3 - (2+1)
  });

  it("blocks free user at 3 imports", () => {
    const result = checkImportLimit("free", 3, null);
    expect(result.allowed).toBe(false);
    expect(result.importsRemaining).toBe(0);
  });

  it("blocks free user above 3 imports", () => {
    const result = checkImportLimit("free", 5, null);
    expect(result.allowed).toBe(false);
  });

  it("allows chef user with any number of imports", () => {
    const result = checkImportLimit("chef", 50, null);
    expect(result.allowed).toBe(true);
    expect(result.importsRemaining).toBeNull(); // unlimited
  });

  it("resets monthly count when past reset date", () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
    const result = checkImportLimit("free", 3, pastDate);
    expect(result.needsReset).toBe(true);
    expect(result.currentImports).toBe(0);
    expect(result.allowed).toBe(true); // reset clears count
  });

  it("does not reset when before reset date", () => {
    const futureDate = new Date(Date.now() + 86400000 * 7).toISOString(); // 7 days
    const result = checkImportLimit("free", 2, futureDate);
    expect(result.needsReset).toBe(false);
    expect(result.currentImports).toBe(2);
  });

  it("calculates correct imports remaining after reset", () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const result = checkImportLimit("free", 3, pastDate);
    // After reset: currentImports=0, so remaining = 3 - (0+1) = 2
    expect(result.importsRemaining).toBe(2);
  });
});

// ─── Title Similarity (Duplicate Detection) ───────────────────────

describe("Title Similarity for Duplicate Detection", () => {
  // Replicate the word-overlap logic used in import-recipe
  const computeTitleSimilarity = (titleA: string, titleB: string): number => {
    const normalize = (t: string) =>
      t
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 1);

    const wordsA = normalize(titleA);
    const wordsB = normalize(titleB);

    if (wordsA.length === 0 || wordsB.length === 0) return 0;

    const setB = new Set(wordsB);
    const overlap = wordsA.filter((w) => setB.has(w)).length;
    return overlap / Math.max(wordsA.length, wordsB.length);
  };

  it("returns 1.0 for identical titles", () => {
    expect(computeTitleSimilarity("Pasta Carbonara", "Pasta Carbonara")).toBe(
      1.0
    );
  });

  it("returns 1.0 for case-insensitive match", () => {
    expect(computeTitleSimilarity("pasta carbonara", "PASTA CARBONARA")).toBe(
      1.0
    );
  });

  it("returns high similarity for very similar titles", () => {
    const sim = computeTitleSimilarity(
      "Chicken Tikka Masala",
      "Chicken Tikka Masala Recipe"
    );
    expect(sim).toBeGreaterThanOrEqual(0.5);
  });

  it("returns >=0.5 for subset titles (triggers confirmation)", () => {
    const sim = computeTitleSimilarity("Carbonara", "Pasta Carbonara");
    // "carbonara" matches in both; min length is 1, max is 2 → 1/2 = 0.5
    expect(sim).toBeGreaterThanOrEqual(0.5);
  });

  it("returns low similarity for different recipes", () => {
    const sim = computeTitleSimilarity(
      "Chicken Tikka Masala",
      "Chocolate Lava Cake"
    );
    expect(sim).toBeLessThan(0.5);
  });

  it("handles empty strings", () => {
    expect(computeTitleSimilarity("", "Something")).toBe(0);
    expect(computeTitleSimilarity("Something", "")).toBe(0);
  });

  it("ignores punctuation and special characters", () => {
    const sim = computeTitleSimilarity(
      "Chef's Pasta (Easy!)",
      "Chefs Pasta Easy"
    );
    expect(sim).toBe(1.0);
  });

  it("ignores single-character words", () => {
    // "a" is filtered out
    const sim = computeTitleSimilarity("A Simple Salad", "Simple Salad");
    expect(sim).toBe(1.0);
  });
});
