// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigExpo from "eslint-config-expo/flat.js";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // Expo-specific rules (React, React Native, React Hooks)
  ...eslintConfigExpo,

  // Prettier compatibility (disables conflicting rules)
  eslintConfigPrettier,

  // Global ignores
  {
    ignores: [
      "node_modules/",
      ".expo/",
      "dist/",
      "web-build/",
      "android/",
      "ios/",
      "*.config.js",
      "*.config.mjs",
      "babel.config.js",
      "metro.config.js",
      "supabase/functions/", // Deno runtime, uses different config
    ],
  },

  // Project-specific rules
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      // TypeScript
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],

      // React
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // React Native - enforce best practices from skills
      "react-native/no-inline-styles": "off", // Inline styles are preferred per building-native-ui skill
      "react-native/no-color-literals": "off", // Color literals are fine

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
    },
  }
);
