import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Chez",
  slug: "chez",
  owner: "mateodazab",
  version: "1.0.1",
  orientation: "portrait",
  icon: "./assets/AppIcons/appstore.png",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  scheme: "chez",
  splash: {
    image: "./assets/chez-only-hat.png",
    resizeMode: "contain",
    backgroundColor: "#FFFBF5",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.chez.app",
    appleTeamId: "Z8P46VMUC9",
    buildNumber: "7",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/AppIcons/playstore.png",
      backgroundColor: "#ffffff",
    },
    package: "com.chez.app",
  },
  web: {
    favicon: "./assets/chez-only-hat.png",
    bundler: "metro",
  },
  plugins: ["expo-router", "expo-secure-store", "expo-sqlite"],
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: "fa748d00-89c9-4dd0-972b-81a5821ffeac",
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    // RevenueCat API keys - set in .env
    revenueCatIosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    revenueCatAndroidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    adminUserId: process.env.EXPO_PUBLIC_ADMIN_USER_ID || "",
  },
});
