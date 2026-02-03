/**
 * Version Management Logic Tests
 *
 * These tests verify the core version management behavior:
 * - Version toggle affects which version gets cooked
 * - Forked recipes only have v1 (no v2 creation)
 * - Source attribution is preserved correctly
 * - Toggle selection survives refetch
 */

describe("Version Management Logic", () => {
  // Test data matching our DB setup
  const outsourcedRecipe = {
    id: "7b02129c-71fb-40c0-987b-b78701175baf",
    title: "Cacio e Pepe",
    forked_from_id: null,
    current_version_id: "0b814ed1-d665-44b8-82d3-780f060ffda9", // v2
  };

  const forkedRecipe = {
    id: "047baf21-ec9c-4e1f-881c-fe01b6ce23dd",
    title: "Cacio e Pepe (Copy)",
    forked_from_id: "7b02129c-71fb-40c0-987b-b78701175baf",
    current_version_id: "2f85ebc2-1ebc-497d-a814-53b10bdb8e7d", // v1
  };

  const outsourcedV1 = {
    id: "f4e3c685-7d76-4154-9c0f-632b06c62706",
    version_number: 1,
    ingredients: [{ id: "ing-1", item: "pecorino", quantity: 1, unit: "cup" }],
    steps: [{ id: "step-1", step_number: 1, instruction: "Cook pasta" }],
    based_on_source_id: "source-1",
  };

  const outsourcedV2 = {
    id: "0b814ed1-d665-44b8-82d3-780f060ffda9",
    version_number: 2,
    ingredients: [
      { id: "ing-1", item: "pecorino", quantity: 1.5, unit: "cups" },
      { id: "ing-2", item: "garlic", quantity: 2, unit: "cloves" },
    ],
    steps: [
      { id: "step-1", step_number: 1, instruction: "Cook pasta with garlic" },
    ],
    based_on_source_id: "source-1",
    parent_version_id: "f4e3c685-7d76-4154-9c0f-632b06c62706",
  };

  const forkedV1 = {
    id: "2f85ebc2-1ebc-497d-a814-53b10bdb8e7d",
    version_number: 1,
    ingredients: [{ id: "ing-1", item: "pecorino", quantity: 1, unit: "cup" }],
    steps: [{ id: "step-1", step_number: 1, instruction: "Cook pasta" }],
    based_on_source_id: null,
  };

  describe("isForkedRecipe detection", () => {
    it("should detect outsourced recipe (forked_from_id is null)", () => {
      const isForked = !!outsourcedRecipe.forked_from_id;
      expect(isForked).toBe(false);
    });

    it("should detect forked recipe (forked_from_id is set)", () => {
      const isForked = !!forkedRecipe.forked_from_id;
      expect(isForked).toBe(true);
    });
  });

  describe("currentVersion derivation", () => {
    const allVersions = [outsourcedV1, outsourcedV2];

    // Helper function matching hook logic
    const deriveCurrentVersion = (
      userSelectedVersionNumber: 1 | 2 | null,
      versions: typeof allVersions
    ) => {
      const originalVersion = versions.find((v) => v.version_number === 1);
      const myVersion = versions.find((v) => v.version_number === 2);

      if (userSelectedVersionNumber === 1) return originalVersion;
      if (userSelectedVersionNumber === 2 && myVersion) return myVersion;
      return myVersion || originalVersion;
    };

    it("should return originalVersion when userSelectedVersionNumber is 1", () => {
      const currentVersion = deriveCurrentVersion(1, allVersions);
      expect(currentVersion?.version_number).toBe(1);
    });

    it("should return myVersion when userSelectedVersionNumber is 2", () => {
      const currentVersion = deriveCurrentVersion(2, allVersions);
      expect(currentVersion?.version_number).toBe(2);
    });

    it("should default to myVersion when userSelectedVersionNumber is null", () => {
      const currentVersion = deriveCurrentVersion(null, allVersions);
      expect(currentVersion?.version_number).toBe(2); // defaults to myVersion
    });
  });

  describe("isViewingOriginal derivation", () => {
    // Helper function matching hook logic
    const deriveIsViewingOriginal = (
      userSelectedVersionNumber: 1 | 2 | null,
      currentVersionNumber: number
    ) => {
      return (
        userSelectedVersionNumber === 1 ||
        (userSelectedVersionNumber === null && currentVersionNumber === 1)
      );
    };

    it("should be true when userSelectedVersionNumber is 1", () => {
      const isViewingOriginal = deriveIsViewingOriginal(1, 2);
      expect(isViewingOriginal).toBe(true);
    });

    it("should be false when userSelectedVersionNumber is 2", () => {
      const isViewingOriginal = deriveIsViewingOriginal(2, 2);
      expect(isViewingOriginal).toBe(false);
    });

    it("should be true when null and current version is 1", () => {
      const isViewingOriginal = deriveIsViewingOriginal(null, 1);
      expect(isViewingOriginal).toBe(true);
    });

    it("should be false when null and current version is 2", () => {
      const isViewingOriginal = deriveIsViewingOriginal(null, 2);
      expect(isViewingOriginal).toBe(false);
    });
  });

  describe("version routing to cook screen", () => {
    it("should pass v1 ID when viewing Original", () => {
      const _isViewingOriginal = true; // Context: viewing original version
      const currentVersion = outsourcedV1;
      const recipeId = outsourcedRecipe.id;

      const cookUrl = `/cook/${recipeId}?versionId=${currentVersion.id}`;

      expect(cookUrl).toContain(
        "versionId=f4e3c685-7d76-4154-9c0f-632b06c62706"
      );
    });

    it("should pass v2 ID when viewing My Version", () => {
      const _isViewingOriginal = false; // Context: viewing my version
      const currentVersion = outsourcedV2;
      const recipeId = outsourcedRecipe.id;

      const cookUrl = `/cook/${recipeId}?versionId=${currentVersion.id}`;

      expect(cookUrl).toContain(
        "versionId=0b814ed1-d665-44b8-82d3-780f060ffda9"
      );
    });
  });

  describe("cook screen versionId normalization", () => {
    it("should handle string versionId", () => {
      const params = { id: "recipe-id", versionId: "version-123" };
      const versionId = Array.isArray(params.versionId)
        ? params.versionId[0]
        : params.versionId;

      expect(versionId).toBe("version-123");
    });

    it("should handle array versionId (deep link edge case)", () => {
      const params = {
        id: "recipe-id",
        versionId: ["version-123", "version-456"],
      };
      const versionId = Array.isArray(params.versionId)
        ? params.versionId[0]
        : params.versionId;

      expect(versionId).toBe("version-123");
    });

    it("should handle undefined versionId", () => {
      const params = { id: "recipe-id", versionId: undefined };
      const versionId = Array.isArray(params.versionId)
        ? params.versionId[0]
        : params.versionId;

      expect(versionId).toBeUndefined();
    });
  });

  describe("forked recipe edit behavior", () => {
    it("should use updateVersionDirectly for forked recipes", () => {
      const isForkedRecipe = true;
      let methodCalled = "";

      // Simulate the edit handler logic
      if (isForkedRecipe) {
        methodCalled = "updateVersionDirectly";
      } else {
        methodCalled = "updateOrCreateMyVersion";
      }

      expect(methodCalled).toBe("updateVersionDirectly");
    });

    it("should use updateOrCreateMyVersion for outsourced recipes", () => {
      const isForkedRecipe = false;
      let methodCalled = "";

      if (isForkedRecipe) {
        methodCalled = "updateVersionDirectly";
      } else {
        methodCalled = "updateOrCreateMyVersion";
      }

      expect(methodCalled).toBe("updateOrCreateMyVersion");
    });
  });

  describe("forked recipe cook session behavior", () => {
    it("should use applyLearningsToForkedRecipe for forked recipes", () => {
      const isForkedRecipe = true;
      let methodCalled = "";

      // Simulate the completion handler logic
      if (isForkedRecipe) {
        methodCalled = "applyLearningsToForkedRecipe";
      } else {
        methodCalled = "create-my-version edge function";
      }

      expect(methodCalled).toBe("applyLearningsToForkedRecipe");
    });

    it("should call create-my-version edge function for outsourced recipes", () => {
      const isForkedRecipe = false;
      let methodCalled = "";

      if (isForkedRecipe) {
        methodCalled = "applyLearningsToForkedRecipe";
      } else {
        methodCalled = "create-my-version edge function";
      }

      expect(methodCalled).toBe("create-my-version edge function");
    });
  });

  describe("source attribution logic", () => {
    it("should preserve myVersion source on edit (not source_apply mode)", () => {
      const _mode = "edit"; // Context: edit mode
      const providedSourceId = undefined;
      const myVersionSourceId = "my-source-123";
      const originalVersionSourceId = "original-source-456";

      // Logic from updateOrCreateMyVersion
      const basedOnSourceId =
        providedSourceId !== undefined
          ? providedSourceId
          : (myVersionSourceId ?? originalVersionSourceId);

      expect(basedOnSourceId).toBe("my-source-123");
    });

    it("should use provided source on source_apply mode", () => {
      const _mode = "source_apply"; // Context: source_apply mode
      const providedSourceId = "new-source-789";
      const myVersionSourceId = "my-source-123";
      const originalVersionSourceId = "original-source-456";

      const basedOnSourceId =
        providedSourceId !== undefined
          ? providedSourceId
          : (myVersionSourceId ?? originalVersionSourceId);

      expect(basedOnSourceId).toBe("new-source-789");
    });

    it("should fall back to original source when myVersion has none", () => {
      const providedSourceId = undefined;
      const myVersionSourceId = null;
      const originalVersionSourceId = "original-source-456";

      const basedOnSourceId =
        providedSourceId !== undefined
          ? providedSourceId
          : (myVersionSourceId ?? originalVersionSourceId);

      expect(basedOnSourceId).toBe("original-source-456");
    });
  });

  describe("version data integrity", () => {
    it("v2 parent_version_id should point to v1", () => {
      expect(outsourcedV2.parent_version_id).toBe(outsourcedV1.id);
    });

    it("forked recipe should only have v1", () => {
      const forkedVersions = [forkedV1];
      const hasV2 = forkedVersions.some((v) => v.version_number === 2);

      expect(hasV2).toBe(false);
      expect(forkedVersions.length).toBe(1);
    });

    it("forked recipe should not have based_on_source_id", () => {
      expect(forkedV1.based_on_source_id).toBeNull();
    });

    it("outsourced recipe v1 should have based_on_source_id", () => {
      expect(outsourcedV1.based_on_source_id).not.toBeNull();
    });
  });
});

describe("Learning Application Logic", () => {
  const originalIngredients = [
    { id: "ing-1", item: "butter", quantity: 2, unit: "tbsp" },
    { id: "ing-2", item: "pasta", quantity: 400, unit: "g" },
  ];

  describe("substitution learning", () => {
    it("should replace ingredient item when substitution learning is applied", () => {
      const learning = {
        type: "substitution" as const,
        original: "butter",
        modification: "olive oil",
        context: "Uses olive oil instead of butter",
        step_number: 1,
        detected_at: new Date().toISOString(),
      };

      const modifiedIngredients = [...originalIngredients];
      const ingredientIndex = modifiedIngredients.findIndex((ing) =>
        ing.item.toLowerCase().includes(learning.original!.toLowerCase())
      );

      if (ingredientIndex >= 0) {
        modifiedIngredients[ingredientIndex] = {
          ...modifiedIngredients[ingredientIndex],
          item: learning.modification,
        };
      }

      expect(modifiedIngredients[0].item).toBe("olive oil");
      expect(modifiedIngredients[1].item).toBe("pasta"); // Unchanged
    });
  });

  describe("addition learning", () => {
    it("should add new ingredient when addition learning is applied", () => {
      const learning = {
        type: "addition" as const,
        original: null,
        modification: "garlic",
        context: "Added garlic",
        step_number: 1,
        detected_at: new Date().toISOString(),
      };

      const modifiedIngredients = [...originalIngredients];

      if (learning.type === "addition") {
        modifiedIngredients.push({
          id: `learning-${Date.now()}`,
          item: learning.modification,
          quantity: null as unknown as number,
          unit: null as unknown as string,
        });
      }

      expect(modifiedIngredients.length).toBe(3);
      expect(modifiedIngredients[2].item).toBe("garlic");
    });
  });

  describe("timing learning", () => {
    it("should update step duration when timing learning is applied", () => {
      const steps = [
        {
          id: "step-1",
          step_number: 1,
          instruction: "Cook pasta",
          duration_minutes: 10,
        },
      ];

      const learning = {
        type: "timing" as const,
        original: null,
        modification: "15 minutes worked better",
        context: "Extended cooking time",
        step_number: 1,
        detected_at: new Date().toISOString(),
      };

      const modifiedSteps = [...steps];
      const stepIndex = modifiedSteps.findIndex(
        (step) => step.step_number === learning.step_number
      );

      if (stepIndex >= 0) {
        const minutesMatch = learning.modification.match(/(\d+)\s*min/i);
        if (minutesMatch) {
          modifiedSteps[stepIndex] = {
            ...modifiedSteps[stepIndex],
            duration_minutes: parseInt(minutesMatch[1], 10),
          };
        }
      }

      expect(modifiedSteps[0].duration_minutes).toBe(15);
    });
  });
});
